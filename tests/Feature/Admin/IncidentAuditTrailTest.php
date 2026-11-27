<?php

use App\Models\Incident;
use App\Models\IncidentStatusHistory;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Create an incident and its corresponding audit history entry.
 *
 * @param  array<string, mixed>  $incidentOverrides
 * @param  array<string, mixed>  $historyOverrides
 */
function createIncidentAuditEntry(
    User $reporter,
    User $actor,
    array $incidentOverrides = [],
    array $historyOverrides = []
): IncidentStatusHistory {
    // Create an incident using the existing database structure.
    $incident = (new Incident)->forceFill(array_merge([
        'user_id' => $reporter->id,
        'category' => 'Theft or Robbery',
        'incident_date' => now()->toDateString(),
        'incident_time' => '20:30:00',
        'description' => 'Audit trail test incident description.',
        'location_description' => 'Mabini Street, Panghulo',
        'latitude' => 14.7000000,
        'longitude' => 120.9500000,
        'source_type' => 'community_user',
        'status' => 'pending',
    ], $incidentOverrides));

    $incident->save();

    // Create the corresponding incident status history entry.
    $history = (new IncidentStatusHistory)->forceFill(array_merge([
        'incident_id' => $incident->id,
        'changed_by' => $actor->id,
        'old_status' => 'pending',
        'new_status' => 'verified',
        'severity' => 'Moderate',
        'reason' => 'Report verified by administrator.',
    ], $historyOverrides));

    $history->save();

    return $history;
}

// Prepare an administrator and community reporter for each test.
beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $this->reporter = User::factory()->create([
        'role' => 'community_user',
    ]);
});

test('guests cannot access the incident audit trail', function () {
    // Unauthenticated visitors must be redirected to login.
    $this->get(route('admin.audit-trail.index'))
        ->assertRedirect(route('login'));
});

test('community users cannot access the incident audit trail', function () {
    // Attempt access using a community account.
    $this->actingAs($this->reporter)
        ->get(route('admin.audit-trail.index'))
        ->assertForbidden();
});

test('administrators can view incident history and action details', function () {
    // Create a verified incident history entry.
    $history = createIncidentAuditEntry(
        $this->reporter,
        $this->admin
    );

    $response = $this->actingAs($this->admin)
        ->get(route('admin.audit-trail.index'));

    $response->assertOk();

    // Confirm that the history, actor, incident, and reporter
    // are available to the administrator through Inertia.
    $response->assertInertia(fn (Assert $page) => $page
        ->component('admin/audit-trail/index')
        ->where('history.total', 1)
        ->has('history.data', 1)
        ->where('history.data.0.id', $history->id)
        ->where('history.data.0.incident_id', $history->incident_id)
        ->where('history.data.0.old_status', 'pending')
        ->where('history.data.0.new_status', 'verified')
        ->where('history.data.0.actor.name', $this->admin->name)
        ->where('history.data.0.actor.role', 'administrator')
        ->where('history.data.0.incident.category', 'Theft or Robbery')
        ->where(
            'history.data.0.incident.reporter.name',
            $this->reporter->name
        )
        ->where(
            'history.data.0.reason',
            'Report verified by administrator.'
        )
        ->where('filters.status', '')
        ->where('filters.category', '')
    );
});

test('administrators can filter history by status category and action date', function () {
    // Matching record: status, category, and action date all match.
    $matchingHistory = createIncidentAuditEntry(
        $this->reporter,
        $this->admin,
        [
            'category' => 'Harassment',
        ],
        [
            'old_status' => 'pending',
            'new_status' => 'under_review',
            'created_at' => Carbon::parse('2026-11-12 10:00:00'),
            'updated_at' => Carbon::parse('2026-11-12 10:00:00'),
        ]
    );

    // Different status.
    createIncidentAuditEntry(
        $this->reporter,
        $this->admin,
        [
            'category' => 'Harassment',
        ],
        [
            'new_status' => 'verified',
            'created_at' => Carbon::parse('2026-11-12 11:00:00'),
            'updated_at' => Carbon::parse('2026-11-12 11:00:00'),
        ]
    );

    // Different category.
    createIncidentAuditEntry(
        $this->reporter,
        $this->admin,
        [
            'category' => 'Theft or Robbery',
        ],
        [
            'new_status' => 'under_review',
            'created_at' => Carbon::parse('2026-11-12 12:00:00'),
            'updated_at' => Carbon::parse('2026-11-12 12:00:00'),
        ]
    );

    // Action date outside the selected range.
    createIncidentAuditEntry(
        $this->reporter,
        $this->admin,
        [
            'category' => 'Harassment',
        ],
        [
            'new_status' => 'under_review',
            'created_at' => Carbon::parse('2026-11-20 10:00:00'),
            'updated_at' => Carbon::parse('2026-11-20 10:00:00'),
        ]
    );

    // Apply all four filters.
    $response = $this->actingAs($this->admin)
        ->get(route('admin.audit-trail.index', [
            'from' => '2026-11-11',
            'to' => '2026-11-15',
            'status' => 'under_review',
            'category' => 'Harassment',
        ]));

    $response->assertOk();

    // Only the matching history entry should be returned.
    $response->assertInertia(fn (Assert $page) => $page
        ->component('admin/audit-trail/index')
        ->where('history.total', 1)
        ->has('history.data', 1)
        ->where('history.data.0.id', $matchingHistory->id)
        ->where('filters.from', '2026-11-11')
        ->where('filters.to', '2026-11-15')
        ->where('filters.status', 'under_review')
        ->where('filters.category', 'Harassment')
    );
});

test('audit trail rejects a start date later than the end date', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.audit-trail.index', [
            'from' => '2026-11-20',
            'to' => '2026-11-10',
        ]));

    $response->assertSessionHasErrors('from');
});

test('audit trail paginates history and displays newest entries first', function () {
    // Create sixteen history records to test the 15-entry page limit.
    $latestHistory = null;

    for ($index = 0; $index < 16; $index++) {
        $createdAt = Carbon::parse('2026-11-01 00:00:00')
            ->addMinutes($index);

        $history = createIncidentAuditEntry(
            $this->reporter,
            $this->admin,
            [],
            [
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]
        );

        // Keep a reference to the newest history entry.
        $latestHistory = $history;
    }

    $response = $this->actingAs($this->admin)
        ->get(route('admin.audit-trail.index'));

    $response->assertOk();

    // Confirm pagination and descending chronological order.
    $response->assertInertia(fn (Assert $page) => $page
        ->component('admin/audit-trail/index')
        ->where('history.total', 16)
        ->has('history.data', 15)
        ->where('history.data.0.id', $latestHistory->id)
        ->has('history.links', 4)
    );
});
