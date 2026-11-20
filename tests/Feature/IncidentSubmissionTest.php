
<?php

use App\Models\Incident;
use App\Models\IncidentImage;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Provide valid incident submission data for feature tests.
 *
 * Individual tests can override any field when needed.
 *
 * @return array<string, mixed>
 */
function panghuloIncidentSubmissionData(array $overrides = []): array
{
    return array_merge([
        'category' => 'Theft or Robbery',
        'incident_date' => now()->toDateString(),
        'incident_time' => '20:30',
        'location_description' => 'Near Panghulo Main Road',
        'description' => 'A test incident report for submission validation.',
        'latitude' => 14.6872,
        'longitude' => 120.9547,
    ], $overrides);
}

beforeEach(function () {
    // Create a verified community account for submission tests.
    $this->communityUser = User::factory()->create([
        'role' => 'community_user',
    ]);
});

test('guests cannot submit incident reports', function () {
    // Unauthenticated visitors must be redirected to login.
    $this->post(route('incidents.store'), panghuloIncidentSubmissionData())
        ->assertRedirect(route('login'));

    $this->assertDatabaseCount('incidents', 0);
});

test('community users can submit incidents inside Panghulo', function () {
    Storage::fake('local');

    // Submit an incident using coordinates inside the real Panghulo boundary.
    $response = $this->actingAs($this->communityUser)
        ->post(
            route('incidents.store'),
            panghuloIncidentSubmissionData()
        );

    $response
        ->assertRedirect(route('incidents.create'))
        ->assertSessionHas('success');

    // Confirm that the incident belongs to the submitting community user.
    $incident = Incident::query()
        ->where('user_id', $this->communityUser->id)
        ->firstOrFail();

    expect($incident->status)->toBe('pending')
        ->and($incident->source_type)->toBe('community_user')
        ->and($incident->category)->toBe('Theft or Robbery');

    // Confirm that the initial status history was recorded.
    $this->assertDatabaseHas('incident_status_histories', [
        'incident_id' => $incident->id,
        'changed_by' => $this->communityUser->id,
        'old_status' => null,
        'new_status' => 'pending',
        'reason' => 'Incident report submitted.',
    ]);
});

test('community users cannot submit incidents outside Panghulo', function () {
    Storage::fake('local');

    // Coordinates at 0,0 are clearly outside Barangay Panghulo.
    $response = $this->actingAs($this->communityUser)
        ->post(
            route('incidents.store'),
            panghuloIncidentSubmissionData([
                'latitude' => 0,
                'longitude' => 0,
            ])
        );

    // The server must reject the selected location.
    $response->assertSessionHasErrors('latitude');

    // No incident should be saved for an outside location.
    $this->assertDatabaseCount('incidents', 0);
});

test('community users can upload private incident evidence images', function () {
    Storage::fake('local');
    // Create a fake JPEG upload without requiring the GD extension.
    $image = UploadedFile::fake()->create(
        'evidence.jpg',
        100,
        'image/jpeg'
    );
    $response = $this->actingAs($this->communityUser)
        ->post(
            route('incidents.store'),
            panghuloIncidentSubmissionData([
                'images' => [$image],
            ])
        );

    $response
        ->assertRedirect(route('incidents.create'))
        ->assertSessionHas('success');

    $incident = Incident::query()
        ->where('user_id', $this->communityUser->id)
        ->firstOrFail();

    // Confirm that the evidence image is associated with the incident.
    $storedImage = IncidentImage::query()
        ->where('incident_id', $incident->id)
        ->firstOrFail();

    // Confirm that the file exists on the private local disk.
    Storage::disk('local')->assertExists($storedImage->path);

    expect($storedImage->mime_type)->toBe('image/jpeg');
});

test('community users cannot upload non-image evidence files', function () {
    Storage::fake('local');

    // A PDF must not be accepted as incident evidence.
    $invalidFile = UploadedFile::fake()->create(
        'evidence.pdf',
        100,
        'application/pdf'
    );

    $response = $this->actingAs($this->communityUser)
        ->post(
            route('incidents.store'),
            panghuloIncidentSubmissionData([
                'images' => [$invalidFile],
            ])
        );

    // The uploaded file must fail the image validation rule.
    $response->assertSessionHasErrors('images.0');

    // The invalid report and its evidence must not be stored.
    $this->assertDatabaseCount('incidents', 0);
    $this->assertDatabaseCount('incident_images', 0);
});
