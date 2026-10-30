<?php

use App\Models\Incident;
use App\Models\User;
use App\Notifications\IncidentSafetyAlert;
use App\Notifications\IncidentStatusUpdated;

// Prepare an administrator, reporter, and pending incident for each test.
beforeEach(function () {
    // Create an administrator who will review the incident.
    $this->admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    // Create the community member who submitted the report.
    $this->reporter = User::factory()->create([
        'role' => 'community_user',
    ]);

    // Create a pending incident using the existing database structure.
    $this->incident = (new Incident())->forceFill([
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

test('verifying an incident notifies the reporter and other verified community users', function () {
    // Create another verified community member.
    $communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    // Verify the incident as an administrator.
    $response = $this->actingAs($this->admin)
        ->post(route('admin.incidents.verify', $this->incident), [
            'severity' => 'High',
        ]);

    $response->assertRedirect();

    // The incident must now be verified.
    expect($this->incident->fresh()->status)->toBe('verified');

    // The reporter receives the existing private status notification.
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $this->reporter->id,
        'notifiable_type' => User::class,
        'type' => IncidentStatusUpdated::class,
    ]);

    // Another verified community member receives a safety alert.
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $communityUser->id,
        'notifiable_type' => User::class,
        'type' => IncidentSafetyAlert::class,
    ]);
});

test('the reporter does not receive a duplicate community safety alert', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.incidents.verify', $this->incident), [
            'severity' => 'Moderate',
        ]);

    // The reporter receives the status update, not a community alert.
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $this->reporter->id,
        'type' => IncidentStatusUpdated::class,
    ]);

    $this->assertDatabaseMissing('notifications', [
        'notifiable_id' => $this->reporter->id,
        'type' => IncidentSafetyAlert::class,
    ]);
});

test('administrators do not receive community safety alerts', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.incidents.verify', $this->incident), [
            'severity' => 'Low',
        ]);

    $this->assertDatabaseMissing('notifications', [
        'notifiable_id' => $this->admin->id,
        'type' => IncidentSafetyAlert::class,
    ]);
});

test('unverified community users do not receive safety alerts', function () {
    // Create a community member who has not verified their email.
    $unverifiedUser = User::factory()
        ->unverified()
        ->create([
            'role' => 'community_user',
        ]);

    $this->actingAs($this->admin)
        ->post(route('admin.incidents.verify', $this->incident), [
            'severity' => 'Critical',
        ]);

    $this->assertDatabaseMissing('notifications', [
        'notifiable_id' => $unverifiedUser->id,
        'type' => IncidentSafetyAlert::class,
    ]);
});

test('rejecting an incident does not send community safety alerts', function () {
    $communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.incidents.reject', $this->incident), [
            'rejection_reason' => 'Insufficient evidence provided.',
        ]);

    expect($this->incident->fresh()->status)->toBe('rejected');

    // The reporter receives the rejection update.
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $this->reporter->id,
        'type' => IncidentStatusUpdated::class,
    ]);

    // Other community members receive no safety alert.
    $this->assertDatabaseMissing('notifications', [
        'notifiable_id' => $communityUser->id,
        'type' => IncidentSafetyAlert::class,
    ]);
});

test('an already verified incident cannot generate duplicate safety alerts', function () {
    $communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    // First verification should succeed.
    $this->actingAs($this->admin)
        ->post(route('admin.incidents.verify', $this->incident), [
            'severity' => 'High',
        ]);

    $notificationCount = $communityUser->notifications()
        ->where('type', IncidentSafetyAlert::class)
        ->count();

    expect($notificationCount)->toBe(1);

    // A second verification attempt should be rejected.
    $this->actingAs($this->admin)
        ->post(route('admin.incidents.verify', $this->incident), [
            'severity' => 'Critical',
        ])
        ->assertSessionHasErrors('incident');

    // The second request must not create another alert.
    expect(
        $communityUser->notifications()
            ->where('type', IncidentSafetyAlert::class)
            ->count()
    )->toBe(1);
});

test('community safety alert does not expose private incident information', function () {
    $communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    $this->actingAs($this->admin)
        ->post(route('admin.incidents.verify', $this->incident), [
            'severity' => 'High',
        ]);

    $notification = $communityUser->notifications()
        ->where('type', IncidentSafetyAlert::class)
        ->firstOrFail();

    $data = $notification->data;

    // Confirm that only approved public information is included.
    expect($data)
        ->toHaveKey('category', 'Robbery')
        ->toHaveKey('severity', 'High')
        ->toHaveKey('priority', 'high')
        ->toHaveKey('approximate_area', 'Barangay Panghulo, Malabon City')
        ->not->toHaveKey('description')
        ->not->toHaveKey('latitude')
        ->not->toHaveKey('longitude')
        ->not->toHaveKey('reporter_id')
        ->not->toHaveKey('evidence');
});
