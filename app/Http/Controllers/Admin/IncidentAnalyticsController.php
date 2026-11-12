<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class IncidentAnalyticsController extends Controller
{
    /**
     * Display administrator-only incident analytics.
     *
     * Summary statistics include all report statuses.
     * Trends, categories, severity, and locations use verified incidents only.
     */
    public function __invoke(Request $request): Response
    {
        // Only administrators may access system-wide analytics.
        abort_unless(
            $request->user()?->role === 'administrator',
            403,
            'Only administrators can access incident analytics.'
        );

        // Accept optional date filters in YYYY-MM-DD format.
        $filters = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ]);

        // Default to the latest twelve months when dates are not supplied.
        $endDate = Carbon::parse(
            (string) ($filters['to'] ?? Carbon::today()->toDateString())
        )->endOfDay();

        $startDate = Carbon::parse(
            (string) (
                $filters['from']
                ?? $endDate->copy()->subMonths(11)->startOfMonth()->toDateString()
            )
        )->startOfDay();

        // Prevent invalid date ranges.
        if ($startDate->greaterThan($endDate)) {
            throw ValidationException::withMessages([
                'from' => 'The start date must be before or equal to the end date.',
            ]);
        }

        // Filter inclusively by calendar date.
        // This handles database values stored with a time component.
        $baseQuery = Incident::query()
            ->whereDate('incident_date', '>=', $startDate->toDateString())
            ->whereDate('incident_date', '<=', $endDate->toDateString());
        // Count all report statuses for the summary cards.
        $totalReports = (clone $baseQuery)->count();

        $pendingReports = (clone $baseQuery)
            ->whereIn('status', ['pending', 'under_review'])
            ->count();

        $rejectedReports = (clone $baseQuery)
            ->where('status', 'rejected')
            ->count();

        // Verified reports are the only records used in safety analytics.
        $verifiedQuery = (clone $baseQuery)
            ->where('status', 'verified');

        $verifiedIncidents = (clone $verifiedQuery)->count();

        $highSeverityIncidents = (clone $verifiedQuery)
            ->whereIn('severity', ['High', 'Critical'])
            ->count();

        // Prepare every month in the selected date range, including zero counts.
        $monthlyTotals = [];

        $monthCursor = $startDate->copy()->startOfMonth();
        $lastMonth = $endDate->copy()->startOfMonth();

        while ($monthCursor->lessThanOrEqualTo($lastMonth)) {
            $monthlyTotals[$monthCursor->format('Y-m')] = 0;

            $monthCursor->addMonth();
        }

        // Initialize the severity categories so zero-count levels also appear.
        $severityTotals = [
            'Low' => 0,
            'Moderate' => 0,
            'High' => 0,
            'Critical' => 0,
            'Not assigned' => 0,
        ];

        // These arrays hold counts for the verified incident breakdowns.
        $categoryTotals = [];
        $locationTotals = [];

        // Process verified incidents without loading the entire result set into memory.
        $verifiedRecords = (clone $verifiedQuery)
            ->select([
                'incident_date',
                'category',
                'severity',
                'location_description',
            ])
            ->cursor();

        foreach ($verifiedRecords as $incident) {
            // Group the incident under its calendar month.
            $monthKey = Carbon::parse($incident->incident_date)
                ->format('Y-m');

            if (array_key_exists($monthKey, $monthlyTotals)) {
                $monthlyTotals[$monthKey]++;
            }

            // Count incidents by category.
            $category = $incident->category;

            $categoryTotals[$category] =
                ($categoryTotals[$category] ?? 0) + 1;

            // Count incidents by severity.
            $severity = $incident->severity ?: 'Not assigned';

            if (! array_key_exists($severity, $severityTotals)) {
                $severityTotals[$severity] = 0;
            }

            $severityTotals[$severity]++;

            // Group matching location descriptions together.
            // These are the street or landmark descriptions entered by reporters.
            $location = trim($incident->location_description);

            if ($location === '') {
                $location = 'Unspecified location';
            }

            $locationTotals[$location] =
                ($locationTotals[$location] ?? 0) + 1;
        }

        // Convert monthly totals into chart-friendly data.
        $monthlyTrend = [];

        foreach ($monthlyTotals as $month => $total) {
            $monthlyTrend[] = [
                'month' => $month,
                'label' => Carbon::parse($month.'-01')->format('M Y'),
                'total' => $total,
            ];
        }

        // Sort categories from most reported to least reported.
        arsort($categoryTotals);

        $categoryBreakdown = [];

        foreach ($categoryTotals as $category => $total) {
            $categoryBreakdown[] = [
                'category' => $category,
                'total' => $total,
            ];
        }

        // Keep a consistent severity order in the chart.
        $severityBreakdown = [];

        foreach ($severityTotals as $severity => $total) {
            $severityBreakdown[] = [
                'severity' => $severity,
                'total' => $total,
            ];
        }

        // Display the ten most frequently reported locations.
        arsort($locationTotals);

        $topLocations = [];

        foreach (array_slice($locationTotals, 0, 10, true) as $location => $total) {
            $topLocations[] = [
                'location' => $location,
                'total' => $total,
            ];
        }

        // Return the analytics data to the React/Inertia page.
        return Inertia::render('admin/analytics/index', [
            'filters' => [
                'from' => $startDate->toDateString(),
                'to' => $endDate->toDateString(),
            ],

            'stats' => [
                'totalReports' => $totalReports,
                'pendingReports' => $pendingReports,
                'verifiedIncidents' => $verifiedIncidents,
                'rejectedReports' => $rejectedReports,
                'highSeverityIncidents' => $highSeverityIncidents,
            ],

            'monthlyTrend' => $monthlyTrend,
            'categoryBreakdown' => $categoryBreakdown,
            'severityBreakdown' => $severityBreakdown,
            'topLocations' => $topLocations,
        ]);
    }
}
