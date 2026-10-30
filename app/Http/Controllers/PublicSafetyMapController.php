<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use Carbon\Carbon;
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
            ->map(function (Incident $incident): array {
                $incidentDate = filled($incident->incident_date)
                    ? Carbon::parse($incident->incident_date)->toDateString()
                    : null;

                $verifiedAt = filled($incident->verified_at)
                    ? Carbon::parse($incident->verified_at)->toIso8601String()
                    : null;

                return [
                    'id' => $incident->id,
                    'category' => $incident->category,
                    'incident_date' => $incidentDate,
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

                    'verified_at' => $verifiedAt,

                    'approximate_area' => 'Barangay Panghulo, Malabon City',
                ];
            })
            ->all();

        return Inertia::render('safety-map/index', [
            'incidents' => $incidents,
        ]);
    }
}
