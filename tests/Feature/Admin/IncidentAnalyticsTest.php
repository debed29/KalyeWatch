<?php

use App\Models\Incident;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * Create an incident using the existing database schema.
 *
 * @param  array<string, mixed>  $overrides
 */
function createAnalyticsIncident(
    User $reporter,
    array $overrides = []
): Incident {
    $incident = new Incident;

    // Provide the required fields and allow each test to customize its incident.
    $incident->forceFill(array_merge([
        'user_id' => $reporter->id,
        'category' => 'Theft or Robbery',
        'incident_date' => now()->toDateString(),
        'incident_time' => '20:30:00',
        'description' => 'Analytics test incident description.',
        'location_description' => 'Mabini Street',
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

// Guests must sign in before accessing administrator analytics.
test('guests cannot access incident analytics', function () {
    $this->get(route('admin.analytics'))
        ->assertRedirect(route('login'));
});

// Community users must not access system-wide analytics.
test('community users cannot access incident analytics', function () {
    $communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    $this->actingAs($communityUser)
        ->get(route('admin.analytics'))
        ->assertForbidden();
});

// Administrators can view analytics based on actual incident records.
test('administrators can view incident analytics', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $reporter = User::factory()->create([
        'role' => 'community_user',
    ]);

    // Two verified reports at the same location.
    createAnalyticsIncident($reporter, [
        'category' => 'Theft or Robbery',
        'status' => 'verified',
        'severity' => 'High',
        'location_description' => 'Mabini Street',
    ]);

    createAnalyticsIncident($reporter, [
        'category' => 'Theft or Robbery',
        'status' => 'verified',
        'severity' => 'Moderate',
        'location_description' => 'Mabini Street',
    ]);

    // One additional verified report in another category.
    createAnalyticsIncident($reporter, [
        'category' => 'Street Accidents',
        'status' => 'verified',
        'severity' => 'Low',
        'location_description' => 'Panghulo Road',
    ]);

    // Pending and rejected reports count in the summary,
    // but must not appear in verified-incident charts.
    createAnalyticsIncident($reporter, [
        'category' => 'Harassment',
        'status' => 'pending',
    ]);

    createAnalyticsIncident($reporter, [
        'category' => 'Suspicious Activities',
        'status' => 'rejected',
    ]);
    // Request analytics as an administrator.
    $response = $this->actingAs($admin)
        ->get(route('admin.analytics'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('admin/analytics/index')
        ->where('stats.totalReports', 5)
        ->where('stats.pendingReports', 1)
        ->where('stats.verifiedIncidents', 3)
        ->where('stats.rejectedReports', 1)
        ->where('stats.highSeverityIncidents', 1)
        ->has('categoryBreakdown', 2)
        ->where('categoryBreakdown.0.category', 'Theft or Robbery')
        ->where('categoryBreakdown.0.total', 2)
        ->where('categoryBreakdown.1.category', 'Street Accidents')
        ->where('categoryBreakdown.1.total', 1)
        ->has('severityBreakdown', 5)
        ->where('severityBreakdown.0.severity', 'Low')
        ->where('severityBreakdown.0.total', 1)
        ->where('severityBreakdown.1.severity', 'Moderate')
        ->where('severityBreakdown.1.total', 1)
        ->where('severityBreakdown.2.severity', 'High')
        ->where('severityBreakdown.2.total', 1)
        ->has('topLocations', 2)
        ->where('topLocations.0.location', 'Mabini Street')
        ->where('topLocations.0.total', 2)
        // The current month is the twelfth (last) month in the default range.
        ->where('monthlyTrend.11.month', now()->format('Y-m'))
        ->where('monthlyTrend.11.total', 3)
    );
});

// Selected dates must restrict both summary statistics and charts.
test('analytics respects the selected date range', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $reporter = User::factory()->create([
        'role' => 'community_user',
    ]);

    $startDate = now()->startOfMonth()->toDateString();
    $endDate = now()->endOfMonth()->toDateString();

    createAnalyticsIncident($reporter, [
        'status' => 'verified',
        'severity' => 'High',
        'incident_date' => now()->toDateString(),
    ]);

    // This incident is outside the selected date range.
    createAnalyticsIncident($reporter, [
        'status' => 'verified',
        'severity' => 'Critical',
        'incident_date' => now()->subMonths(2)->toDateString(),
    ]);

    $response = $this->actingAs($admin)
        ->get(route('admin.analytics', [
            'from' => $startDate,
            'to' => $endDate,
        ]));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('admin/analytics/index')
        ->where('filters.from', $startDate)
        ->where('filters.to', $endDate)
        ->where('stats.totalReports', 1)
        ->where('stats.verifiedIncidents', 1)
        ->where('stats.highSeverityIncidents', 1)
        ->has('monthlyTrend', 1)
        ->where('monthlyTrend.0.total', 1)
    );
});

// Invalid date ranges must not produce misleading analytics.
test('analytics rejects a start date later than the end date', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.analytics', [
            'from' => now()->toDateString(),
            'to' => now()->subDay()->toDateString(),
        ]))
        ->assertSessionHasErrors('from');
});
