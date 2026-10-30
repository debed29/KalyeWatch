<?php

use App\Models\User;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Fortify\Features;

// The login page should render successfully.
test('login screen can be rendered', function () {
    $response = $this->get(route('login'));

    $response->assertOk();
});

// Users can log in without being assigned to a team.
test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();

    // The dashboard no longer uses a team slug in its URL.
    $response->assertRedirect('/dashboard');
});

// Two-factor authentication is tested only when the feature is enabled.
test('users with two factor enabled are redirected to two factor challenge', function () {
    if (! Features::canManageTwoFactorAuthentication()) {
        $this->markTestSkipped('Two-factor authentication is not enabled.');
    }

    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $user = User::factory()->withTwoFactor()->create();

    $response = $this->post(route('login'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('two-factor.login'));
    $response->assertSessionHas('login.id', $user->id);

    $this->assertGuest();
});

// Incorrect passwords must not authenticate users.
test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();
});

// Users can log out of their accounts.
test('users can logout', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('logout'));

    $this->assertGuest();

    $response->assertRedirect(route('home'));
});

// Login attempts are rate limited.
test('users are rate limited', function () {
    $user = User::factory()->create();

    RateLimiter::increment(
        md5('login'.implode('|', [$user->email, '127.0.0.1'])),
        amount: 5
    );

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $response->assertTooManyRequests();
});
