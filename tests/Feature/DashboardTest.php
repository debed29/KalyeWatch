<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

// Guests must log in before accessing the dashboard.
test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));

    $response->assertRedirect(route('login'));
});

// Authenticated users can access the dashboard without belonging to a team.
test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
    );
});
