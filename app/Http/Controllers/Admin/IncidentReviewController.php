<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\Incident;
use App\Models\IncidentImage;
use App\Models\User;
use App\Notifications\IncidentSafetyAlert;
use App\Notifications\IncidentStatusUpdated;
use Illuminate\Support\Facades\DB;

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
     * Verify an incident report.
     *
     * The administrator must select a severity level.
     * Once verified, the system updates the incident,
     * records its status history, and notifies the reporter.
     */

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
            $incidentDate = $currentIncident->incident_date->toDateString();

            // Send notifications only after the transaction successfully commits.
            DB::afterCommit(function () use (
                $reporterId,
                $incidentId,
                $category,
                $severity,
                $incidentDate
            ): void {
                // Preserve the existing private notification for the reporter.
                User::query()
                    ->find($reporterId)
                    ?->notify(
                        new IncidentStatusUpdated(
                            $incidentId,
                            $category,
                            'verified',
                            'Your report has been verified by the administrator.'
                        )
                    );

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
     * Reject an incident report.
     *
     * The administrator must provide a rejection reason.
     * The system saves the reason, records the rejection
     * history, and sends a notification to the reporter.
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

        // Prevent an incident from being reviewed more than once.
        if (! in_array(
            $incident->status,
            ['pending', 'under_review'],
            true
        )) {
            return back()->withErrors([
                'incident' => 'This report has already been reviewed.',
            ]);
        }

        // Save the previous status for the incident history.
        $previousStatus = $incident->status;

        // Update the incident status and save the rejection reason.
        $incident->forceFill([
            'status' => 'rejected',
            'severity' => null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'verified_at' => null,
            'rejection_reason' => $validated['rejection_reason'],
        ])->save();

        // Record the rejection activity in the status history.
        $incident->statusHistories()->create([
            'changed_by' => $request->user()->id,
            'old_status' => $previousStatus,
            'new_status' => 'rejected',
            'severity' => null,
            'reason' => $validated['rejection_reason'],
        ]);

        // Notify the community user and include the rejection reason.
        $incident->reporter?->notify(
            new IncidentStatusUpdated(
                $incident->id,
                $incident->category,
                'rejected',
                $validated['rejection_reason']
            )
        );

        // Return to the review page with a success message.
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
        ){
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
