<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IncidentExportController extends Controller
{
    /**
     * Export incident reports as a downloadable CSV file.
     *
     * Only administrators can download system-wide incident records.
     */
    public function __invoke(Request $request): StreamedResponse
    {
        // Prevent community users from downloading system-wide reports.
        abort_unless(
            $request->user()?->role === 'administrator',
            403,
            'Only administrators can export incident reports.'
        );

        // Validate all optional export filters.
        $filters = $request->validate([
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],

            'category' => [
                'nullable',
                'in:Theft or Robbery,Harassment,Physical Altercations,Suspicious Activities,Street Accidents',
            ],

            'status' => [
                'nullable',
                'in:pending,under_review,verified,rejected,archived',
            ],

            'severity' => [
                'nullable',
                'in:Low,Moderate,High,Critical,unassigned',
            ],
        ]);

        // Reject a date range where the start date is later than the end date.
        if (
            isset($filters['from'], $filters['to'])
            && Carbon::parse($filters['from'])
                ->greaterThan(Carbon::parse($filters['to']))
        ) {
            throw ValidationException::withMessages([
                'from' => 'The start date must be before or equal to the end date.',
            ]);
        }

        // Start with all incident records and load reporter names efficiently.
        $query = Incident::query()
            ->with('reporter:id,name');

        // Apply the optional start date.
        if (isset($filters['from'])) {
            $query->whereDate(
                'incident_date',
                '>=',
                $filters['from']
            );
        }

        // Apply the optional end date inclusively.
        if (isset($filters['to'])) {
            $query->whereDate(
                'incident_date',
                '<=',
                $filters['to']
            );
        }

        // Filter by incident category when selected.
        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        // Filter by report status when selected.
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Filter by severity, including reports without assigned severity.
        if (isset($filters['severity'])) {
            if ($filters['severity'] === 'unassigned') {
                $query->whereNull('severity');
            } else {
                $query->where('severity', $filters['severity']);
            }
        }

        // Generate a unique filename for this export.
        $filename = 'kalyewatch-incident-reports-'.now()->format('Ymd_His').'.csv';

        // Stream the CSV download instead of building the entire file in memory.
        return response()->streamDownload(
            function () use ($query): void {
                // Open the response output stream.
                $output = fopen('php://output', 'wb');

                if ($output === false) {
                    throw new RuntimeException(
                        'Unable to create the incident export.'
                    );
                }

                try {
                    // Add a UTF-8 BOM to improve compatibility with spreadsheet apps.
                    fwrite($output, "\xEF\xBB\xBF");

                    // Write the CSV column headings.
                    fputcsv($output, [
                        'Incident ID',
                        'Category',
                        'Incident Date',
                        'Incident Time',
                        'Location Description',
                        'Description',
                        'Status',
                        'Severity',
                        'Reporter Name',
                        'Submitted At',
                        'Reviewed At',
                        'Verified At',
                        'Rejection Reason',
                    ], ',', '"', '');

                    // Retrieve records in manageable batches.
                    // This avoids loading every matching incident into memory.
                    foreach ($query->orderBy('id')->lazyById(500) as $incident) {
                        // Prepare the incident information for the CSV row.
                        $row = [
                            $incident->id,
                            $incident->category,
                            Carbon::parse($incident->incident_date)->format('Y-m-d'),
                            $incident->location_description,
                            $incident->description,
                            $incident->status,
                            $incident->severity,
                            $incident->reporter?->name,
                            $incident->created_at
                                ? Carbon::parse($incident->created_at)->toDateTimeString()
                                : null,
                            $incident->reviewed_at
                                ? Carbon::parse($incident->reviewed_at)->toDateTimeString()
                                : null,
                            $incident->verified_at
                                ? Carbon::parse($incident->verified_at)->toDateTimeString()
                                : null,
                            $incident->rejection_reason,
                        ];

                        // Prevent untrusted text from becoming spreadsheet formulas.
                        $safeRow = array_map(
                            fn ($value): string => $this->safeCsvCell($value),
                            $row
                        );

                        // Write this incident as one CSV row.
                        fputcsv($output, $safeRow, ',', '"', '');
                    }
                } finally {
                    // Always close the output stream when finished.
                    fclose($output);
                }
            },
            $filename,
            [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Cache-Control' => 'no-store, private',
                'X-Content-Type-Options' => 'nosniff',
            ]
        );
    }

    /**
     * Convert a value into a safe CSV cell.
     *
     * Prefix potentially dangerous spreadsheet formula values
     * with an apostrophe before writing them to the CSV file.
     */
    private function safeCsvCell(mixed $value): string
    {
        // Convert null values into empty CSV cells.
        $text = (string) ($value ?? '');

        // Protect against formula injection from reporter-entered text.
        if (preg_match('/^\s*[=+\-@]/u', $text) === 1) {
            return "'".$text;
        }

        return $text;
    }
}
