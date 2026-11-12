
<?php

use App\Models\Incident;
use App\Models\User;

/**
 * Create an incident for CSV export tests.
 *
 * @param  array<string, mixed>  $overrides
 */
function createExportTestIncident(
    User $reporter,
    array $overrides = []
): Incident {
    $incident = new Incident;

    // Set default values using the existing incidents table.
    $incident->forceFill(array_merge([
        'user_id' => $reporter->id,
        'category' => 'Theft or Robbery',
        'incident_date' => now()->toDateString(),
        'incident_time' => '20:30:00',
        'description' => 'Incident export test description.',
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

// Guests must sign in before downloading incident reports.
test('guests cannot export incident reports', function () {
    $this->get(route('admin.incidents.export'))
        ->assertRedirect(route('login'));
});

// Community users must not download system-wide incident reports.
test('community users cannot export incident reports', function () {
    $communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);

    $this->actingAs($communityUser)
        ->get(route('admin.incidents.export'))
        ->assertForbidden();
});

// Administrators can download all incident reports as CSV.
test('administrators can download incident reports as CSV', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $reporter = User::factory()->create([
        'role' => 'community_user',
        'name' => 'Export Test Reporter',
    ]);

    // Create a report containing normal incident information.
    createExportTestIncident($reporter, [
        'description' => 'Normal incident report for CSV testing.',
        'status' => 'verified',
        'severity' => 'High',
    ]);

    // Create a report containing text that resembles a spreadsheet formula.
    createExportTestIncident($reporter, [
        'description' => '=HYPERLINK("https://example.com","Click here")',
        'status' => 'pending',
    ]);

    $response = $this->actingAs($admin)
        ->get(route('admin.incidents.export'));

    // Confirm that the response is a downloadable CSV file.
    $response->assertOk()
        ->assertDownload();

    $response->assertHeader(
        'Content-Type',
        'text/csv; charset=UTF-8'
    );

    // Read the actual contents of the streamed CSV response.
    $content = $response->streamedContent();

    // Confirm that the expected CSV headings and data are present.
    $this->assertStringContainsString('Incident ID', $content);
    $this->assertStringContainsString('Category', $content);
    $this->assertStringContainsString('Incident Date', $content);
    $this->assertStringContainsString('Export Test Reporter', $content);
    $this->assertStringContainsString(
        'Normal incident report for CSV testing.',
        $content
    );

    // Confirm that potentially dangerous spreadsheet formulas are escaped.
    $this->assertStringContainsString(
        "'=HYPERLINK",
        $content
    );

    // Exact coordinates must never appear in the exported CSV.
    $this->assertStringNotContainsString('14.7000000', $content);
    $this->assertStringNotContainsString('120.9500000', $content);

    // Private evidence storage paths must not appear in the export.
    $this->assertStringNotContainsString('incident-evidence/', $content);
});

// Export filters must restrict the CSV to matching incident records.
test('administrators can filter exported reports', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $reporter = User::factory()->create([
        'role' => 'community_user',
    ]);

    // This report should match all selected filters.
    createExportTestIncident($reporter, [
        'category' => 'Theft or Robbery',
        'status' => 'verified',
        'severity' => 'High',
        'incident_date' => now()->toDateString(),
        'description' => 'MATCHING EXPORT REPORT',
    ]);

    // This report has a different severity.
    createExportTestIncident($reporter, [
        'category' => 'Theft or Robbery',
        'status' => 'verified',
        'severity' => 'Moderate',
        'description' => 'EXCLUDED WRONG SEVERITY',
    ]);

    // This report is outside the selected date range.
    createExportTestIncident($reporter, [
        'category' => 'Theft or Robbery',
        'status' => 'verified',
        'severity' => 'High',
        'incident_date' => now()->subMonths(2)->toDateString(),
        'description' => 'EXCLUDED OLD REPORT',
    ]);

    // This report has a different category.
    createExportTestIncident($reporter, [
        'category' => 'Harassment',
        'status' => 'verified',
        'severity' => 'High',
        'description' => 'EXCLUDED WRONG CATEGORY',
    ]);

    $response = $this->actingAs($admin)
        ->get(route('admin.incidents.export', [
            'from' => now()->toDateString(),
            'to' => now()->toDateString(),
            'category' => 'Theft or Robbery',
            'status' => 'verified',
            'severity' => 'High',
        ]));

    $response->assertOk()
        ->assertDownload();

    $content = $response->streamedContent();

    // Only the report matching every filter should be exported.
    $this->assertStringContainsString(
        'MATCHING EXPORT REPORT',
        $content
    );

    $this->assertStringNotContainsString(
        'EXCLUDED WRONG SEVERITY',
        $content
    );

    $this->assertStringNotContainsString(
        'EXCLUDED OLD REPORT',
        $content
    );

    $this->assertStringNotContainsString(
        'EXCLUDED WRONG CATEGORY',
        $content
    );
});

// The unassigned severity option must include reports with a NULL severity.
test('administrators can export reports without assigned severity', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $reporter = User::factory()->create([
        'role' => 'community_user',
    ]);

    // This report has no assigned severity and should be included.
    createExportTestIncident($reporter, [
        'category' => 'Street Accidents',
        'status' => 'pending',
        'severity' => null,
        'description' => 'UNASSIGNED SEVERITY REPORT',
    ]);

    // This report has an assigned severity and should be excluded.
    createExportTestIncident($reporter, [
        'category' => 'Street Accidents',
        'status' => 'pending',
        'severity' => 'Moderate',
        'description' => 'ASSIGNED SEVERITY REPORT',
    ]);

    $response = $this->actingAs($admin)
        ->get(route('admin.incidents.export', [
            'from' => now()->toDateString(),
            'to' => now()->toDateString(),
            'category' => 'Street Accidents',
            'status' => 'pending',
            'severity' => 'unassigned',
        ]));

    $response->assertOk()
        ->assertDownload();

    $content = $response->streamedContent();

    $this->assertStringContainsString(
        'UNASSIGNED SEVERITY REPORT',
        $content
    );

    // Check the complete CSV field to avoid matching part of "UNASSIGNED".
    $this->assertStringNotContainsString(
        '"ASSIGNED SEVERITY REPORT"',
        $content
    );
});

// Invalid date ranges must not generate an export.
test('export rejects a start date later than the end date', function () {
    $admin = User::factory()->create([
        'role' => 'administrator',
    ]);

    $this->actingAs($admin)
        ->get(route('admin.incidents.export', [
            'from' => now()->toDateString(),
            'to' => now()->subDay()->toDateString(),
        ]))
        ->assertSessionHasErrors('from');
});
