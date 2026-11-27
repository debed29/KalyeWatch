<?php

use App\Models\Incident;
use App\Models\User;
use App\Notifications\IncidentStatusEmail;
use App\Notifications\IncidentStatusUpdated;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\Queue;

// Prepare an administrator, reporter, and pending incident for each test.
beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $this->reporter = User::factory()->create([
        'role' => 'community_user',
    ]);

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

// Marking a report under review queues an email for its reporter.
test('marking an incident under review queues an email notification', function () {
    Queue::fake();

    $this->actingAs($this->admin)
        ->post(route('admin.incidents.under-review', $this->incident))
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->incident->fresh()->status)->toBe('under_review');

    // The existing in-app notification must still be created.
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $this->reporter->id,
        'notifiable_type' => User::class,
        'type' => IncidentStatusUpdated::class,
    ]);

    // Confirm that an email notification was queued for the reporter.
    $reporter = $this->reporter;
    $incidentId = $this->incident->id;

    Queue::assertPushed(
        SendQueuedNotifications::class,
        function (SendQueuedNotifications $job) use (
            $reporter,
            $incidentId
        ): bool {
            return $job->notification instanceof IncidentStatusEmail
                && $job->notification->incidentId === $incidentId
                && $job->notification->status === 'under_review'
                && $job->channels === ['mail']
                && $job->notifiables->contains($reporter);
        }
    );
});

// Verifying a report queues an email and preserves in-app notifications.
test('verifying an incident queues an email notification', function () {
    Queue::fake();

    $this->actingAs($this->admin)
        ->post(route('admin.incidents.verify', $this->incident), [
            'severity' => 'High',
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->incident->fresh()->status)->toBe('verified');

    // The reporter must still receive the existing in-app notification.
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $this->reporter->id,
        'notifiable_type' => User::class,
        'type' => IncidentStatusUpdated::class,
    ]);

    // Confirm that the verification email was queued.
    $reporter = $this->reporter;
    $incidentId = $this->incident->id;

    Queue::assertPushed(
        SendQueuedNotifications::class,
        function (SendQueuedNotifications $job) use (
            $reporter,
            $incidentId
        ): bool {
            return $job->notification instanceof IncidentStatusEmail
                && $job->notification->incidentId === $incidentId
                && $job->notification->status === 'verified'
                && $job->channels === ['mail']
                && $job->notifiables->contains($reporter);
        }
    );
});

// Rejecting a report queues an email containing the rejection reason.
test('rejecting an incident queues an email with the rejection reason', function () {
    Queue::fake();

    $rejectionReason = 'Insufficient evidence provided.';

    $this->actingAs($this->admin)
        ->post(route('admin.incidents.reject', $this->incident), [
            'rejection_reason' => $rejectionReason,
        ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->incident->fresh()->status)->toBe('rejected');

    // The existing in-app notification must still be created.
    $this->assertDatabaseHas('notifications', [
        'notifiable_id' => $this->reporter->id,
        'notifiable_type' => User::class,
        'type' => IncidentStatusUpdated::class,
    ]);

    // Confirm that the rejection email contains the correct reason.
    $reporter = $this->reporter;
    $incidentId = $this->incident->id;

    Queue::assertPushed(
        SendQueuedNotifications::class,
        function (SendQueuedNotifications $job) use (
            $reporter,
            $incidentId,
            $rejectionReason
        ): bool {
            return $job->notification instanceof IncidentStatusEmail
                && $job->notification->incidentId === $incidentId
                && $job->notification->status === 'rejected'
                && $job->notification->reason === $rejectionReason
                && $job->channels === ['mail']
                && $job->notifiables->contains($reporter);
        }
    );
});

// Unauthorized users must not cause email notifications to be queued.
test('community users cannot trigger incident status emails', function () {
    Queue::fake();

    $this->actingAs($this->reporter)
        ->post(route('admin.incidents.under-review', $this->incident))
        ->assertForbidden();

    expect($this->incident->fresh()->status)->toBe('pending');

    Queue::assertNothingPushed();

    $this->assertDatabaseCount('incident_status_histories', 0);
});
