<?php

namespace App\Http\Controllers;

use App\Models\Incident;
use App\Services\PanghuloBoundary;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

class IncidentController extends Controller
{
    /**
     * Display the authenticated user's incident reports.
     */
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

    /**
     * Display the incident submission form.
     */
    public function create(): Response
    {
        return Inertia::render('incidents/create');
    }

    /**
     * Save an incident report and its optional evidence photos.
     */
    public function store(
        Request $request,
        PanghuloBoundary $boundary
    ): RedirectResponse {
        // Validate incident details and optional evidence photos.
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

            // Allow up to five evidence photos per incident.
            'images' => ['nullable', 'array', 'max:5'],
            'images.*' => [
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:5120',
            ],
        ]);

        // Confirm that the selected coordinates are inside Panghulo.
        $latitude = (float) $validated['latitude'];
        $longitude = (float) $validated['longitude'];

        if (! $boundary->contains($latitude, $longitude)) {
            return back()
                ->withErrors([
                    'latitude' => 'The selected location is outside Barangay Panghulo. Please choose a location inside the barangay boundary.',
                ])
                ->withInput();
        }

        $user = $request->user();

        if (! $user) {
            abort(403);
        }

        // Keep track of uploaded files so they can be deleted if
        // the database transaction fails.
        $storedPaths = [];

        try {
            DB::transaction(function () use (
                $validated,
                $latitude,
                $longitude,
                $user,
                &$storedPaths
            ) {
                // Create the incident report with a pending status.
                $incident = new Incident([
                    'category' => $validated['category'],
                    'incident_date' => $validated['incident_date'],
                    'incident_time' => $validated['incident_time'] ?? null,
                    'location_description' => $validated['location_description'],
                    'description' => $validated['description'],
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                ]);

                // Set ownership and status on the server.
                $incident->setAttribute('user_id', $user->getKey());
                $incident->setAttribute('source_type', 'community_user');
                $incident->setAttribute('status', 'pending');
                $incident->save();

                // Save each uploaded photo in private local storage.
                foreach ($validated['images'] ?? [] as $image) {
                    $path = $image->store(
                        "incident-evidence/{$incident->id}",
                        'local'
                    );

                    if (! $path) {
                        throw new RuntimeException(
                            'Unable to store an incident evidence image.'
                        );
                    }

                    $storedPaths[] = $path;

                    // Connect the stored photo to its incident report.
                    $incident->images()->create([
                        'path' => $path,
                        'mime_type' => $image->getMimeType(),
                        'size_bytes' => (int) $image->getSize(),
                    ]);
                }

                // Record the initial incident status in its history.
                $incident->statusHistories()->create([
                    'changed_by' => $user->getKey(),
                    'old_status' => null,
                    'new_status' => 'pending',
                    'reason' => 'Incident report submitted.',
                ]);
            });
        } catch (Throwable $exception) {
            // Remove files if saving the report or its image records fails.
            if (! empty($storedPaths)) {
                Storage::disk('local')->delete($storedPaths);
            }

            throw $exception;
        }

        return redirect()
            ->route('incidents.create')
            ->with('success', 'Your incident report was submitted for review.');
    }
}
