<?php

use App\Models\Incident;
use App\Models\User;
use App\Notifications\IncidentStatusUpdated;

// Prepare an administrator, reporter, and pending incident for each test.
beforeEach(function () {
    // Create the administrator who will review the incident.
    $this->admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    // Create the community member who submitted the incident.
    $this->reporter = User::factory()->create([
        'role' => 'community_user',
    ]);

    // Create a pending incident for workflow testing.
    $this->incident = (new Incident)->forceFill([
        'user_id' => $this->reporter->id,
        'category' => 'Robbery',
        'incident_date' => now()->toDateString(),
        'incident_time' => '20:30:00',
        'description' => 'Test incident description.',
        'location_description' => 'Near a local street.',
        'latitude' => 14.7000000,
        'longitude' => 120.9500000,
        'source_type' => 'community_user',
        'status' => 'pending',
    ]);

    $this->incident->save();
});

test('administrator can mark a pending incident as under review', function () {
    // Submit the review action as an administrator.
    $response = $this->actingAs($this->admin)
        ->post(route('admin.incidents.under-review', $this->incident));

    $response
        ->assertRedirect()
        ->assertSessionHas('success', 'Incident marked as under review.');

    // Confirm that the incident status was updated.
    expect($this->incident->fresh()->status)->toBe('under_review');

    // Confirm that the administrator was recorded.
    expect($this->incident->fresh()->reviewed_by)
        ->toBe($this->admin->id);

    // Confirm that the status history was recorded.
    $this->assertDatabaseHas('incident_status_histories', [
        'incident_id' => $this->incident->id,
        'changed_by' => $this->admin->id,
        'old_status' => 'pending',
        'new_status' => 'under_review',
        'reason' => 'Report marked as under review by administrator.',
    ]);

    // Confirm that the reporter received a notification.
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $this->reporter->id,
        'notifiable_type' => User::class,
        'type' => IncidentStatusUpdated::class,
    ]);

    $notification = $this->reporter->notifications()
        ->where('type', IncidentStatusUpdated::class)
        ->firstOrFail();

    expect($notification->data)
        ->toHaveKey('status', 'under_review');
});

test('community users cannot mark incidents as under review', function () {
    // Attempt the action using a community account.
    $response = $this->actingAs($this->reporter)
        ->post(route('admin.incidents.under-review', $this->incident));

    // The controller must deny access.
    $response->assertForbidden();

    // Confirm that the incident remains pending.
    expect($this->incident->fresh()->status)->toBe('pending');

    // Confirm that no status history was created.
    $this->assertDatabaseCount('incident_status_histories', 0);

    // Confirm that no notification was sent.
    $this->assertDatabaseCount('notifications', 0);
});

test('an incident cannot be marked as under review twice', function () {
    // Perform the first status transition.
    $this->actingAs($this->admin)
        ->post(route('admin.incidents.under-review', $this->incident))
        ->assertSessionHas('success');

    // Attempt the same transition again.
    $this->actingAs($this->admin)
        ->post(route('admin.incidents.under-review', $this->incident))
        ->assertSessionHasErrors('incident');

    // The incident must remain under review.
    expect($this->incident->fresh()->status)->toBe('under_review');

    // Only one status history entry should exist.
    $this->assertDatabaseCount('incident_status_histories', 1);

    // Only one status notification should be sent.
    expect(
        $this->reporter->notifications()
            ->where('type', IncidentStatusUpdated::class)
            ->count()
    )->toBe(1);
});

test('an incident under review can subsequently be rejected', function () {
    // First, mark the incident as under review.
    $this->actingAs($this->admin)
        ->post(route('admin.incidents.under-review', $this->incident))
        ->assertSessionHas('success');

    // Then reject it with a valid explanation.
    $this->actingAs($this->admin)
        ->post(route('admin.incidents.reject', $this->incident), [
            'rejection_reason' => 'Insufficient evidence provided.',
        ])
        ->assertSessionHas(
            'success',
            'Incident rejected. The reason has been recorded.'
        );

    // Confirm that the final status is rejected.
    expect($this->incident->fresh()->status)->toBe('rejected');

    // Confirm that the transition history is accurate.
    $this->assertDatabaseHas('incident_status_histories', [
        'incident_id' => $this->incident->id,
        'changed_by' => $this->admin->id,
        'old_status' => 'under_review',
        'new_status' => 'rejected',
        'reason' => 'Insufficient evidence provided.',
    ]);

    // The reporter should receive both status notifications.
    expect(
        $this->reporter->notifications()
            ->where('type', IncidentStatusUpdated::class)
            ->count()
    )->toBe(2);
});
