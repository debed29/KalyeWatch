<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Incident;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncidentReviewController extends Controller
{
    private function authorizeAdministrator(Request $request): void
    {
        abort_unless(
            $request->user()?->role === 'administrator',
            403,
            'Only authorized administrators can review incidents.'
        );
    }

    public function index(Request $request): Response
    {
        $this->authorizeAdministrator($request);

        $incidents = Incident::query()
            ->with('reporter:id,name,email')
            ->whereIn('status', ['pending', 'under_review'])
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('admin/incidents/index', [
            'incidents' => $incidents,
        ]);
    }

    public function verify(
        Request $request,
        Incident $incident
    ): RedirectResponse {
        $this->authorizeAdministrator($request);

        $validated = $request->validate([
            'severity' => [
                'required',
                'in:Low,Moderate,High,Critical',
            ],
        ]);

        if (! in_array(
            $incident->status,
            ['pending', 'under_review'],
            true
        )) {
            return back()->withErrors([
                'incident' => 'This report has already been reviewed.',
            ]);
        }
        $previousStatus = $incident->status;
        $incident->forceFill([
            'status' => 'verified',
            'severity' => $validated['severity'],
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'verified_at' => now(),
            'rejection_reason' => null,
        ])->save();
        $incident->statusHistories()->create([
            'changed_by' => $request->user()->id,
            'old_status' => $previousStatus,
            'new_status' => 'verified',
            'severity' => $validated['severity'],
            'reason' => 'Report verified by administrator.',
   ]);
        $incident->statusHistories()->create([
            'changed_by' => $request->user()->id,
            'old_status' => $previousStatus,
            'new_status' => 'rejected',
            'severity' => null,
            'reason' => $validated['rejection_reason'],
        ]);
        return back()->with(
            'success',
            'Incident verified successfully.'
        );
    }

    public function reject(
        Request $request,
        Incident $incident
    ): RedirectResponse {
        $this->authorizeAdministrator($request);

        $validated = $request->validate([
            'rejection_reason' => [
                'required',
                'string',
                'min:5',
                'max:1000',
            ],
        ]);

        if (! in_array(
            $incident->status,
            ['pending', 'under_review'],
            true
        )) {
            return back()->withErrors([
                'incident' => 'This report has already been reviewed.',
            ]);
        }
        $incident->forceFill([
            'status' => 'rejected',
            'severity' => null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'verified_at' => null,
            'rejection_reason' => $validated['rejection_reason'],
        ])->save();
        return back()->with(
            'success',
            'Incident rejected. The reason has been recorded.'
        );
    }
}
