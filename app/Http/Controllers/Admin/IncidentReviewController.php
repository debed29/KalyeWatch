<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use App\Models\IncidentImage;
use App\Models\User;
use App\Notifications\IncidentSafetyAlert;
use App\Notifications\IncidentStatusEmail;
use App\Notifications\IncidentStatusUpdated;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IncidentReviewController extends Controller
{
    /**
     * Check whether the currently logged-in user
     * has administrator privileges.
     *
     * This prevents community users from accessing
     * incident verification and rejection functions.
     */
    private function authorizeAdministrator(Request $request): void
    {
        abort_unless(
            $request->user()?->role === 'administrator',
            403,
            'Only authorized administrators can review incidents.'
        );
    }

    /**
     * Display all incident reports waiting for review.
     *
     * Only pending and under-review incidents are displayed.
     * Reporter information and evidence image records are loaded
     * to avoid unnecessary database queries.
     */
    public function index(Request $request): Response
    {
        // Make sure only administrators can access this page.
        $this->authorizeAdministrator($request);

        // Retrieve incidents that still need administrator review.
        $incidents = Incident::query()
            ->with([
                'reporter:id,name,email',
                'images:id,incident_id,path,mime_type,size_bytes',
            ])
            ->whereIn('status', ['pending', 'under_review'])
            ->latest()
            ->paginate(10)
            ->withQueryString();

        // Send incident data to the React/Inertia review page.
        return Inertia::render('admin/incidents/index', [
            'incidents' => $incidents,
        ]);
    }

    /**
     * Mark a pending incident as under review.
     *
     * Only administrators can perform this action.
     * The status change and history record are saved atomically.
     * The reporter is notified after the transaction commits.
     */
    public function markUnderReview(
        Request $request,
        Incident $incident
    ): RedirectResponse {
        // Check administrator authorization first.
        $this->authorizeAdministrator($request);

        $adminId = $request->user()->id;

        // Update the incident and record its history atomically.
        $marked = DB::transaction(function () use (
            $incident,
            $adminId
        ): bool {
            // Retrieve the latest status from the database.
            $currentIncident = Incident::query()
                ->findOrFail($incident->id);

            // Only pending incidents can enter the review stage.
            if ($currentIncident->status !== 'pending') {
                return false;
            }

            $previousStatus = $currentIncident->status;
            $reviewedAt = now();

            // Update only if the incident is still pending.
            $updated = Incident::query()
                ->whereKey($incident->id)
                ->where('status', 'pending')
                ->update([
                    'status' => 'under_review',
                    'reviewed_by' => $adminId,
                    'reviewed_at' => $reviewedAt,
                ]);

            // Prevent duplicate status transitions.
            if ($updated !== 1) {
                return false;
            }

            $currentIncident->refresh();

            // Record the status transition.
            $currentIncident->statusHistories()->create([
                'changed_by' => $adminId,
                'old_status' => $previousStatus,
                'new_status' => 'under_review',
                'severity' => null,
                'reason' => 'Report marked as under review by administrator.',
            ]);

            // Capture reporter information for the notification.
            $reporterId = $currentIncident->user_id;
            $incidentId = $currentIncident->id;
            $category = $currentIncident->category;

            // Notify the reporter only after a successful commit.
            DB::afterCommit(function () use (
                $reporterId,
                $incidentId,
                $category
            ): void {
                $reporter = User::query()->find($reporterId);

                if (! $reporter) {
                    return;
                }

                // Preserve the existing in-app notification.
                $reporter->notify(
                    new IncidentStatusUpdated(
                        $incidentId,
                        $category,
                        'under_review',
                        'An administrator has started reviewing your report.'
                    )
                );

                // Queue an email notification for the reporter.
                $reporter->notify(
                    new IncidentStatusEmail(
                        $incidentId,
                        $category,
                        'under_review'
                    )
                );
            });

            return true;
        }, attempts: 3);

        if (! $marked) {
            return back()->withErrors([
                'incident' => 'This report is already being reviewed or has been reviewed.',
            ]);
        }

        return back()->with(
            'success',
            'Incident marked as under review.'
        );
    }

    /**
     * Verify an incident report safely.
     *
     * The database update is conditional so only one administrator
     * can change a pending incident to verified.
     *
     * Notifications are sent only after the transaction commits.
     */
    public function verify(
        Request $request,
        Incident $incident
    ): RedirectResponse {
        // Check administrator authorization first.
        $this->authorizeAdministrator($request);

        // Validate the selected severity level.
        $validated = $request->validate([
            'severity' => [
                'required',
                'in:Low,Moderate,High,Critical',
            ],
        ]);

        // Store the administrator ID before entering the transaction.
        $adminId = $request->user()->id;

        // Perform the status change and history creation atomically.
        $verified = DB::transaction(function () use (
            $incident,
            $validated,
            $adminId
        ): bool {
            // Retrieve the latest incident status from the database.
            $currentIncident = Incident::query()
                ->findOrFail($incident->id);

            // Stop if another administrator has already reviewed it.
            if (! in_array(
                $currentIncident->status,
                ['pending', 'under_review'],
                true
            )) {
                return false;
            }

            // Preserve the actual previous status for the history.
            $previousStatus = $currentIncident->status;

            // Use one timestamp for both review and verification.
            $reviewedAt = now();

            // Atomically update only an incident that is still awaiting review.
            $updated = Incident::query()
                ->whereKey($incident->id)
                ->whereIn('status', ['pending', 'under_review'])
                ->update([
                    'status' => 'verified',
                    'severity' => $validated['severity'],
                    'reviewed_by' => $adminId,
                    'reviewed_at' => $reviewedAt,
                    'verified_at' => $reviewedAt,
                    'rejection_reason' => null,
                ]);

            // If no row was updated, another request already changed it.
            if ($updated !== 1) {
                return false;
            }

            // Reload the successfully verified incident.
            $currentIncident->refresh();

            // Record the verification in the incident status history.
            $currentIncident->statusHistories()->create([
                'changed_by' => $adminId,
                'old_status' => $previousStatus,
                'new_status' => 'verified',
                'severity' => $validated['severity'],
                'reason' => 'Report verified by administrator.',
            ]);

            // Capture only the information needed for notifications.
            $reporterId = $currentIncident->user_id;
            $incidentId = $currentIncident->id;
            $category = $currentIncident->category;
            $severity = $currentIncident->severity;

            // Convert the incident date into a consistent YYYY-MM-DD string.
            $incidentDate = Carbon::parse(
                $currentIncident->incident_date
            )->toDateString();

            // Send notifications only after the transaction successfully commits.
            DB::afterCommit(function () use (
                $reporterId,
                $incidentId,
                $category,
                $severity,
                $incidentDate
            ): void {
                // Retrieve the reporter.
                $reporter = User::query()->find($reporterId);

                if ($reporter) {
                    // Preserve the existing private notification for the reporter.
                    $reporter->notify(
                        new IncidentStatusUpdated(
                            $incidentId,
                            $category,
                            'verified',
                            'Your report has been verified by the administrator.'
                        )
                    );

                    // Queue an email notification for the reporter.
                    $reporter->notify(
                        new IncidentStatusEmail(
                            $incidentId,
                            $category,
                            'verified'
                        )
                    );
                }

                // Find verified community users, excluding the reporter.
                // Administrators and unverified users are not included.
                User::query()
                    ->where('role', 'community_user')
                    ->whereNotNull('email_verified_at')
                    ->where('id', '!=', $reporterId)
                    ->chunkById(100, function ($communityUsers) use (
                        $incidentId,
                        $category,
                        $severity,
                        $incidentDate
                    ) {
                        // Send a safety alert to each eligible community member.
                        foreach ($communityUsers as $communityUser) {
                            $communityUser->notify(
                                new IncidentSafetyAlert(
                                    $incidentId,
                                    $category,
                                    $severity,
                                    $incidentDate
                                )
                            );
                        }
                    });
            });

            return true;
        }, attempts: 3);

        // Show an error if the incident was already reviewed.
        if (! $verified) {
            return back()->withErrors([
                'incident' => 'This report has already been reviewed.',
            ]);
        }

        // Return to the review page with a success message.
        return back()->with(
            'success',
            'Incident verified successfully.'
        );
    }

    /**
     * Reject an incident report safely.
     *
     * The incident update and history record are saved
     * in one transaction. The reporter is notified only
     * after the transaction successfully commits.
     */
    public function reject(
        Request $request,
        Incident $incident
    ): RedirectResponse {
        // Check administrator authorization first.
        $this->authorizeAdministrator($request);

        // Require a valid explanation for rejecting the report.
        $validated = $request->validate([
            'rejection_reason' => [
                'required',
                'string',
                'min:5',
                'max:1000',
            ],
        ]);

        $adminId = $request->user()->id;
        $rejectionReason = $validated['rejection_reason'];

        // Update the incident and record its history atomically.
        $rejected = DB::transaction(function () use (
            $incident,
            $adminId,
            $rejectionReason
        ): bool {
            // Retrieve the latest status from the database.
            $currentIncident = Incident::query()
                ->findOrFail($incident->id);

            // Only incidents awaiting review can be rejected.
            if (! in_array(
                $currentIncident->status,
                ['pending', 'under_review'],
                true
            )) {
                return false;
            }

            $previousStatus = $currentIncident->status;
            $reviewedAt = now();

            // Update only if the incident is still awaiting review.
            $updated = Incident::query()
                ->whereKey($incident->id)
                ->whereIn('status', ['pending', 'under_review'])
                ->update([
                    'status' => 'rejected',
                    'severity' => null,
                    'reviewed_by' => $adminId,
                    'reviewed_at' => $reviewedAt,
                    'verified_at' => null,
                    'rejection_reason' => $rejectionReason,
                ]);

            // Prevent duplicate rejection attempts.
            if ($updated !== 1) {
                return false;
            }

            $currentIncident->refresh();

            // Record the rejection in incident status history.
            $currentIncident->statusHistories()->create([
                'changed_by' => $adminId,
                'old_status' => $previousStatus,
                'new_status' => 'rejected',
                'severity' => null,
                'reason' => $rejectionReason,
            ]);

            // Capture the reporter information for notification.
            $reporterId = $currentIncident->user_id;
            $incidentId = $currentIncident->id;
            $category = $currentIncident->category;

            // Send the reporter notification after commit.
            DB::afterCommit(function () use (
                $reporterId,
                $incidentId,
                $category,
                $rejectionReason
            ): void {
                $reporter = User::query()->find($reporterId);

                if (! $reporter) {
                    return;
                }

                // Preserve the existing in-app notification.
                $reporter->notify(
                    new IncidentStatusUpdated(
                        $incidentId,
                        $category,
                        'rejected',
                        $rejectionReason
                    )
                );

                // Queue an email notification with the rejection reason.
                $reporter->notify(
                    new IncidentStatusEmail(
                        $incidentId,
                        $category,
                        'rejected',
                        $rejectionReason
                    )
                );
            });

            return true;
        }, attempts: 3);

        if (! $rejected) {
            return back()->withErrors([
                'incident' => 'This report has already been reviewed.',
            ]);
        }

        return back()->with(
            'success',
            'Incident rejected. The reason has been recorded.'
        );
    }

    /**
     * Display a private evidence image.
     *
     * Only administrators can access uploaded evidence.
     * The image must belong to the requested incident
     * and must have an allowed image MIME type.
     */
    public function evidence(
        Request $request,
        Incident $incident,
        IncidentImage $image
    ): StreamedResponse {
        // Restrict private evidence access to administrators.
        $this->authorizeAdministrator($request);

        // Make sure the evidence belongs to this incident.
        abort_unless(
            $image->incident_id === $incident->id,
            404
        );

        // Allow only supported image formats.
        abort_unless(
            in_array(
                $image->mime_type,
                ['image/jpeg', 'image/png', 'image/webp'],
                true
            ),
            404
        );

        // Check that the private image file actually exists.
        abort_unless(
            Storage::disk('local')->exists($image->path),
            404
        );

        // Return the image without exposing its storage path.
        return Storage::disk('local')->response(
            $image->path,
            null,
            [
                'Content-Type' => $image->mime_type,
                'Cache-Control' => 'private, no-store',
                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }
}
