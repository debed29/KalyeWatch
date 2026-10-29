<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use Inertia\Inertia;
use Inertia\Response;

class PublicSafetyMapController extends Controller
{
    public function __invoke(): Response
    {
        $incidents = Incident::query()
            ->where('status', 'verified')
            ->latest('verified_at')
            ->get([
                'id',
                'category',
                'incident_date',
                'severity',
                'source_type',
                'latitude',
                'longitude',
                'verified_at',
            ])
            ->map(function (Incident $incident) {
                return [
                    'id' => $incident->id,
                    'category' => $incident->category,
                    'incident_date' => $incident->incident_date?->toDateString(),
                    'severity' => $incident->severity,

                    'source_type' => $incident->source_type === 'barangay_official'
                        ? 'Barangay Official'
                        : 'Community User',

                    // Public map receives generalized coordinates only.
                    'latitude' => $incident->latitude !== null
                        ? round((float) $incident->latitude, 2)
                        : null,

                    'longitude' => $incident->longitude !== null
                        ? round((float) $incident->longitude, 2)
                        : null,

                    'verified_at' => $incident->verified_at?->toIso8601String(),

                    'approximate_area' => 'Barangay Panghulo, Malabon City',
                ];
            })
            ->values();

        return Inertia::render('safety-map/index', [
            'incidents' => $incidents,
        ]);
    }
}
