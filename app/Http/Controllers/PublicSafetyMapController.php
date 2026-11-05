<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use Carbon\Carbon;
use Illuminate\Support\Facades\File;
use Inertia\Inertia;
use Inertia\Response;

class PublicSafetyMapController extends Controller
{
    public function __invoke(): Response
    {
        // Load the street geometry prepared for Barangay Panghulo.
        $streetFile = resource_path('data/panghulo-streets.geojson');

        if (! File::exists($streetFile)) {
            abort(500, 'The Panghulo street map data could not be found.');
        }

        $streetData = json_decode(
            File::get($streetFile),
            true
        );

        if (
            ! is_array($streetData) ||
            ! isset($streetData['features']) ||
            ! is_array($streetData['features'])
        ) {
            abort(500, 'The Panghulo street map data is invalid.');
        }

        // Load verified incidents only.
        // Exact coordinates and reporter information stay on the server.
        $incidents = Incident::query()
            ->where('status', 'verified')
            ->get([
                'location_description',
                'category',
                'severity',
                'incident_date',
            ]);

        // Group verified incident statistics by normalized street name.
        $statisticsByStreet = [];

        foreach ($incidents as $incident) {
            $streetKey = $this->normalizeStreetName(
                $incident->location_description
            );

            // Ignore locations that cannot be matched to a named street.
            // Landmarks such as Panghulo National High School are handled
            // separately in a future map enhancement.
            if ($streetKey === '') {
                continue;
            }

            if (! isset($statisticsByStreet[$streetKey])) {
                $statisticsByStreet[$streetKey] = [
                    'total' => 0,
                    'categories' => [],
                    'severities' => [],
                    'recent_dates' => [],
                ];
            }

            $statisticsByStreet[$streetKey]['total']++;

            // Count incidents by category.
            $category = $incident->category;

            $statisticsByStreet[$streetKey]['categories'][$category] =
                ($statisticsByStreet[$streetKey]['categories'][$category] ?? 0) + 1;

            // Count incidents by severity.
            $severity = $incident->severity ?: 'Not assigned';

            $statisticsByStreet[$streetKey]['severities'][$severity] =
                ($statisticsByStreet[$streetKey]['severities'][$severity] ?? 0) + 1;

            // Save dates for the selected street's statistics panel.
            if ($incident->incident_date) {
                $statisticsByStreet[$streetKey]['recent_dates'][] =
                    Carbon::parse($incident->incident_date)->toDateString();
            }
        }

        // Prepare public street features.
        // Multiple road segments with the same name share one statistic.
        $streets = [];

        foreach ($streetData['features'] as $feature) {
            $properties = $feature['properties'] ?? [];
            $geometry = $feature['geometry'] ?? null;
            $name = $properties['name'] ?? null;

            // Only display named streets with valid line geometry.
            if (
                ! is_string($name) ||
                ! is_array($geometry) ||
                ! in_array(
                    $geometry['type'] ?? null,
                    ['LineString', 'MultiLineString'],
                    true
                )
            ) {
                continue;
            }

            $streetKey = $this->normalizeStreetName($name);

            $statistics = $statisticsByStreet[$streetKey] ?? [
                'total' => 0,
                'categories' => [],
                'severities' => [],
                'recent_dates' => [],
            ];

            // Sort incident dates from newest to oldest.
            $recentDates = array_values(array_unique(
                $statistics['recent_dates']
            ));

            rsort($recentDates);

            $streets[] = [
                'name' => $name,
                'road_type' => $properties['highway'] ?? 'unknown',

                // Public street geometry contains no incident coordinates.
                'geometry' => $geometry,

                // Only aggregated verified incident information is returned.
                'statistics' => [
                    'total' => $statistics['total'],
                    'categories' => $statistics['categories'],
                    'severities' => $statistics['severities'],
                    'recent_dates' => array_slice($recentDates, 0, 5),
                ],
            ];
        }

        return Inertia::render('safety-map/index', [
            'streets' => $streets,

            // Includes verified reports at landmarks even if they are not
            // matched to a street feature.
            'totalVerifiedIncidents' => $incidents->count(),
        ]);
    }

    /**
     * Normalize street labels so capitalization and punctuation differences
     * do not prevent matching an incident to its street.
     */
    private function normalizeStreetName(string $name): string
    {
        $normalized = mb_strtolower(trim($name));

        // Replace punctuation with spaces and normalize repeated whitespace.
        $normalized = preg_replace('/[^\p{L}\p{N}]+/u', ' ', $normalized);

        return trim(preg_replace('/\s+/u', ' ', $normalized) ?? '');
    }
}
