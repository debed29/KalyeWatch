<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the KalyeWatch dashboard with real incident statistics.
     *
     * Administrators can view all reports.
     * Community users can only view their own reports.
     */
    public function __invoke(Request $request): Response
    {
        // Get the currently authenticated user.
        $user = $request->user();

        // Make sure an authenticated User model is available.
        abort_unless($user instanceof User, 401);

        // Determine whether the current user is an administrator.
        $isAdministrator = $user->role === 'administrator';

        // Start with all incident records.
        $incidentQuery = Incident::query();

        // Restrict community users to their own submitted reports.
        if (! $isAdministrator) {
            $incidentQuery->where('user_id', $user->id);
        }

        // Calculate dashboard statistics using the existing incidents table.
        $stats = [
            'totalReports' => (clone $incidentQuery)->count(),

            // Pending and under-review reports both need administrator attention.
            'pendingReview' => (clone $incidentQuery)
                ->whereIn('status', ['pending', 'under_review'])
                ->count(),

            'verifiedIncidents' => (clone $incidentQuery)
                ->where('status', 'verified')
                ->count(),

            // High and Critical incidents are grouped together.
            'highSeverity' => (clone $incidentQuery)
                ->whereIn('severity', ['High', 'Critical'])
                ->count(),
        ];

        // Prepare the latest five reports for the dashboard.
        $recentReportsQuery = (clone $incidentQuery)
            ->latest('created_at')
            ->limit(5);

        // Only administrators need to see who submitted each report.
        if ($isAdministrator) {
            $recentReportsQuery->with('reporter:id,name');
        }

        // Retrieve only the fields needed by the dashboard.
        $recentReports = $recentReportsQuery
            ->get([
                'id',
                'user_id',
                'category',
                'incident_date',
                'location_description',
                'status',
                'severity',
                'created_at',
            ])
            ->map(function (Incident $incident) use ($isAdministrator): array {
                return [
                    'id' => $incident->id,
                    'category' => $incident->category,

                    // Return the date in a consistent format.
                    'incidentDate' => Carbon::parse(
                        $incident->incident_date
                    )->toDateString(),

                    'location' => $incident->location_description,
                    'status' => $incident->status,
                    'severity' => $incident->severity,

                    // Do not expose another user's identity to community members.
                    'reporterName' => $isAdministrator
                        ? $incident->reporter?->name
                        : null,
                ];
            })
            ->values()
            ->all();

        // Send the dashboard data to the React frontend.
        return Inertia::render('dashboard', [
            'stats' => $stats,
            'recentReports' => $recentReports,
            'isAdministrator' => $isAdministrator,
            'scopeLabel' => $isAdministrator
                ? 'All community reports'
                : 'Your submitted reports',
        ]);
    }
}
