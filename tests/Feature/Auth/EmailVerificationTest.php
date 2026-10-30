<?php

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;

// Unverified users can access the email verification screen.
test('email verification screen can be rendered', function () {
    $user = User::factory()->unverified()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('verification.notice'));

    $response->assertOk();
});

// Unverified users cannot access protected settings pages.
test('unverified users are redirected to the email verification prompt', function () {
    $user = User::factory()->unverified()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('appearance.edit'));

    $response->assertRedirect(route('verification.notice'));
});

// A valid verification link verifies the user's email.
test('email can be verified', function () {
    $user = User::factory()->unverified()->create();

    Event::fake();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        [
            'id' => $user->id,
            'hash' => sha1($user->email),
        ]
    );

    $response = $this
        ->actingAs($user)
        ->get($verificationUrl);

    Event::assertDispatched(Verified::class);

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();

    // Verification now redirects directly to the main dashboard.
    $response->assertRedirect('/dashboard?verified=1');
});

// An invalid email hash must not verify the account.
test('email is not verified with invalid hash', function () {
    $user = User::factory()->unverified()->create();

    Event::fake();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        [
            'id' => $user->id,
            'hash' => sha1('wrong-email'),
        ]
    );

    $this
        ->actingAs($user)
        ->get($verificationUrl);

    Event::assertNotDispatched(Verified::class);

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

// An invalid user ID must not verify another account.
test('email is not verified with invalid user id', function () {
    $user = User::factory()->unverified()->create();

    Event::fake();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        [
            'id' => 123,
            'hash' => sha1($user->email),
        ]
    );

    $this
        ->actingAs($user)
        ->get($verificationUrl);

    Event::assertNotDispatched(Verified::class);

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

// Already verified users should go directly to the dashboard.
test('verified user is redirected to dashboard from verification prompt', function () {
    $user = User::factory()->create();

    Event::fake();

    $response = $this
        ->actingAs($user)
        ->get(route('verification.notice'));

    Event::assertNotDispatched(Verified::class);

    $response->assertRedirect('/dashboard');
});

// Visiting a valid verification link again must not fire the event twice.
test('already verified user visiting verification link is redirected without firing event again', function () {
    $user = User::factory()->create();

    Event::fake();

    $verificationUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        [
            'id' => $user->id,
            'hash' => sha1($user->email),
        ]
    );

    $this
        ->actingAs($user)
        ->get($verificationUrl)
        ->assertRedirect('/dashboard?verified=1');

    Event::assertNotDispatched(Verified::class);

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});
