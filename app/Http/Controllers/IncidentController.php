<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use App\Services\PanghuloBoundary;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncidentController extends Controller
{
    public function index(Request $request): Response
    {
        $incidents = Incident::query()
            ->where('user_id', $request->user()->id)
            ->with(['statusHistories.actor:id,name'])
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('incidents/index', [
            'incidents' => $incidents,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('incidents/create');
    }

    public function store(
        Request $request,
        PanghuloBoundary $boundary
    ): RedirectResponse {
        $validated = $request->validate([
            'category' => [
                'required',
                'in:Theft or Robbery,Harassment,Physical Altercations,Suspicious Activities,Street Accidents',
            ],
            'incident_date' => [
                'required',
                'date',
                'before_or_equal:today',
            ],
            'incident_time' => ['nullable', 'date_format:H:i'],
            'location_description' => [
                'required',
                'string',
                'max:255',
            ],
            'description' => [
                'required',
                'string',
                'min:10',
                'max:3000',
            ],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $latitude = (float) $validated['latitude'];
        $longitude = (float) $validated['longitude'];

        if (! $boundary->contains($latitude, $longitude)) {
            return back()
                ->withErrors([
                    'latitude' => 'The selected location is outside Barangay Panghulo. Please choose a location inside the barangay boundary.',
                ])
                ->withInput();
        }

        $incident = new Incident([
            'category' => $validated['category'],
            'incident_date' => $validated['incident_date'],
            'incident_time' => $validated['incident_time'] ?? null,
            'location_description' => $validated['location_description'],
            'description' => $validated['description'],
            'latitude' => $latitude,
            'longitude' => $longitude,
        ]);

        $incident->user_id = $request->user()->id;
        $incident->source_type = 'community_user';
        $incident->status = 'pending';
        $incident->save();

        $incident->statusHistories()->create([
            'changed_by' => $request->user()->id,
            'old_status' => null,
            'new_status' => 'pending',
            'reason' => 'Incident report submitted.',
        ]);

        return redirect()
            ->route('incidents.create')
            ->with('success', 'Your incident report was submitted for review.');
    }
}
