<?php

use App\Models\Incident;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Create a dashboard test incident using the existing database structure.
 *
 * @param  array<string, mixed>  $overrides
 */
function createDashboardIncident(
    User $reporter,
    array $overrides = []
): Incident {
    $incident = new Incident;

    // Provide the required incident fields and allow individual test overrides.
    $incident->forceFill(array_merge([
        'user_id' => $reporter->id,
        'category' => 'Robbery',
        'incident_date' => now()->toDateString(),
        'incident_time' => '20:30:00',
        'description' => 'Dashboard test incident.',
        'location_description' => 'Near a local street.',
        'latitude' => 14.7000000,
        'longitude' => 120.9500000,
        'source_type' => 'community_user',
        'status' => 'pending',
        'severity' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ], $overrides));

    $incident->save();

    return $incident;
}

// Guests must log in before accessing the dashboard.
test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));

    $response->assertRedirect(route('login'));
});

// Authenticated community users can access the dashboard.
test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create([
        'role' => 'community_user',
    ]);

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('isAdministrator', false)
        ->where('stats.totalReports', 0)
        ->where('stats.pendingReview', 0)
        ->where('stats.verifiedIncidents', 0)
        ->where('stats.highSeverity', 0)
        ->has('recentReports', 0)
    );
});

// Community users must only see their own incident statistics and reports.
test('community users only see their own incident data', function () {
    $communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    $anotherUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    // Create one pending report belonging to the logged-in user.
    createDashboardIncident($communityUser, [
        'category' => 'Robbery',
        'status' => 'pending',
        'created_at' => now()->subMinutes(2),
    ]);

    // Create one verified high-severity report belonging to the logged-in user.
    createDashboardIncident($communityUser, [
        'category' => 'Theft',
        'status' => 'verified',
        'severity' => 'High',
        'created_at' => now()->subMinute(),
    ]);

    // Create another user's report that must not appear on this dashboard.
    createDashboardIncident($anotherUser, [
        'category' => 'Other User Report',
        'status' => 'verified',
        'severity' => 'Critical',
    ]);

    $response = $this
        ->actingAs($communityUser)
        ->get(route('dashboard'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('isAdministrator', false)
        ->where('scopeLabel', 'Your submitted reports')
        ->where('stats.totalReports', 2)
        ->where('stats.pendingReview', 1)
        ->where('stats.verifiedIncidents', 1)
        ->where('stats.highSeverity', 1)
        ->has('recentReports', 2)
        ->where('recentReports.0.category', 'Theft')
        ->where('recentReports.0.reporterName', null)
    );
});

// Administrators must see reports submitted by different community users.
test('administrators can see system-wide incident statistics and reporter names', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $firstReporter = User::factory()->create([
        'role' => 'community_user',
    ]);

    $secondReporter = User::factory()->create([
        'role' => 'community_user',
    ]);

    // Create a pending report from the first community user.
    createDashboardIncident($firstReporter, [
        'category' => 'Robbery',
        'status' => 'pending',
        'created_at' => now()->subMinute(),
    ]);

    // Create a verified Critical report from the second community user.
    createDashboardIncident($secondReporter, [
        'category' => 'Theft',
        'status' => 'verified',
        'severity' => 'Critical',
    ]);

    $response = $this
        ->actingAs($admin)
        ->get(route('dashboard'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('isAdministrator', true)
        ->where('scopeLabel', 'All community reports')
        ->where('stats.totalReports', 2)
        ->where('stats.pendingReview', 1)
        ->where('stats.verifiedIncidents', 1)
        ->where('stats.highSeverity', 1)
        ->has('recentReports', 2)
        ->where('recentReports.0.category', 'Theft')
        ->where('recentReports.0.reporterName', $secondReporter->name)
    );
});
