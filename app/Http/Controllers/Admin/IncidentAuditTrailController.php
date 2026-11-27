<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\IncidentStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class IncidentAuditTrailController extends Controller
{
    /**
     * Display the system-wide incident status history.
     *
     * Only administrators can access this page.
     * Filters can narrow the history by status, category,
     * and the date the status change was recorded.
     */
    public function index(Request $request): Response
    {
        // Restrict system-wide audit trail access to administrators.
        abort_unless(
            $request->user()?->role === 'administrator',
            403,
            'Only administrators can access the incident audit trail.'
        );

        // Available incident categories.
        $categories = [
            'Theft or Robbery',
            'Harassment',
            'Physical Altercations',
            'Suspicious Activities',
            'Street Accidents',
        ];

        // Validate optional audit trail filters.
        $filters = $request->validate([
            'from' => [
                'nullable',
                'date_format:Y-m-d',
            ],
            'to' => [
                'nullable',
                'date_format:Y-m-d',
            ],
            'status' => [
                'nullable',
                'in:pending,under_review,verified,rejected,archived',
            ],
            'category' => [
                'nullable',
                'in:Theft or Robbery,Harassment,Physical Altercations,Suspicious Activities,Street Accidents',
            ],
        ]);

        // Make sure the selected date range is valid.
        if (
            isset($filters['from'], $filters['to'])
            && Carbon::parse($filters['from'])
                ->greaterThan(Carbon::parse($filters['to']))
        ) {
            throw ValidationException::withMessages([
                'from' => 'The start date must be before or equal to the end date.',
            ]);
        }

        // Retrieve incident history with the related incident and user.
        $query = IncidentStatusHistory::query()
            ->with([
                // Administrator or community user who performed the action.
                'actor:id,name,role',

                // Related incident information.
                'incident:id,user_id,category,incident_date,location_description',

                // Original reporter's name.
                'incident.reporter:id,name',
            ]);

        // Filter by the status resulting from the recorded action.
        if (isset($filters['status'])) {
            $query->where('new_status', $filters['status']);
        }

        // Filter by incident category.
        if (isset($filters['category'])) {
            $query->whereHas('incident', function ($incidentQuery) use (
                $filters
            ): void {
                $incidentQuery->where(
                    'category',
                    $filters['category']
                );
            });
        }

        // Filter by the date the history entry was recorded.
        if (isset($filters['from'])) {
            $query->whereDate(
                'created_at',
                '>=',
                $filters['from']
            );
        }

        if (isset($filters['to'])) {
            $query->whereDate(
                'created_at',
                '<=',
                $filters['to']
            );
        }

        // Display the newest status changes first.
        // The ID provides a consistent order for identical timestamps.
        $history = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(15)
            ->withQueryString();

        // Send the audit trail records and active filters to React.
        return Inertia::render('admin/audit-trail/index', [
            'history' => $history,

            'filters' => [
                'from' => $filters['from'] ?? '',
                'to' => $filters['to'] ?? '',
                'status' => $filters['status'] ?? '',
                'category' => $filters['category'] ?? '',
            ],

            'categories' => $categories,

            'statuses' => [
                'pending',
                'under_review',
                'verified',
                'rejected',
                'archived',
            ],
        ]);
    }
}
