<?php

use App\Services\PanghuloBoundary;
use Tests\TestCase;

// Bootstrap Laravel for tests that use application helpers and paths.
uses(TestCase::class);
/**
 * Create a temporary GeoJSON file for boundary tests.
 *
 * @throws RuntimeException When the temporary file cannot be created.
 */
function createKalyewatchBoundaryTestFile(string $contents): string
{
    $path = tempnam(sys_get_temp_dir(), 'kalyewatch-boundary-');

    if ($path === false) {
        throw new RuntimeException('Unable to create temporary boundary file.');
    }

    if (file_put_contents($path, $contents) === false) {
        unlink($path);

        throw new RuntimeException('Unable to write temporary boundary file.');
    }

    return $path;
}

/**
 * Remove a temporary GeoJSON test file.
 */
function removeKalyewatchBoundaryTestFile(string $path): void
{
    if (is_file($path)) {
        unlink($path);
    }
}

test('uses the application Panghulo boundary by default', function () {
    // The committed boundary must recognize a known Panghulo location.
    expect(
        (new PanghuloBoundary)->contains(14.6872, 120.9547)
    )->toBeTrue();
});

test('accepts coordinates inside a supplied polygon', function () {
    // Create a simple rectangular polygon around the test location.
    $geoJson = <<<'JSON'
    {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [120.0, 14.0],
                            [121.0, 14.0],
                            [121.0, 15.0],
                            [120.0, 15.0],
                            [120.0, 14.0]
                        ]
                    ]
                }
            }
        ]
    }
    JSON;

    $path = createKalyewatchBoundaryTestFile($geoJson);

    try {
        // The test point is inside the rectangular polygon.
        expect(
            (new PanghuloBoundary($path))->contains(14.5, 120.5)
        )->toBeTrue();
    } finally {
        removeKalyewatchBoundaryTestFile($path);
    }
});

test('rejects coordinates outside a supplied polygon', function () {
    $geoJson = <<<'JSON'
    {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [120.0, 14.0],
                            [121.0, 14.0],
                            [121.0, 15.0],
                            [120.0, 15.0],
                            [120.0, 14.0]
                        ]
                    ]
                }
            }
        ]
    }
    JSON;

    $path = createKalyewatchBoundaryTestFile($geoJson);

    try {
        // This point is outside the rectangular polygon.
        expect(
            (new PanghuloBoundary($path))->contains(14.5, 121.5)
        )->toBeFalse();
    } finally {
        removeKalyewatchBoundaryTestFile($path);
    }
});

test('accepts coordinates inside a multipolygon boundary', function () {
    $geoJson = <<<'JSON'
    {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "MultiPolygon",
                    "coordinates": [
                        [
                            [
                                [120.0, 14.0],
                                [121.0, 14.0],
                                [121.0, 15.0],
                                [120.0, 15.0],
                                [120.0, 14.0]
                            ]
                        ],
                        [
                            [
                                [122.0, 14.0],
                                [123.0, 14.0],
                                [123.0, 15.0],
                                [122.0, 15.0],
                                [122.0, 14.0]
                            ]
                        ]
                    ]
                }
            }
        ]
    }
    JSON;

    $path = createKalyewatchBoundaryTestFile($geoJson);

    try {
        // The point is inside the second polygon.
        expect(
            (new PanghuloBoundary($path))->contains(14.5, 122.5)
        )->toBeTrue();
    } finally {
        removeKalyewatchBoundaryTestFile($path);
    }
});

test('rejects coordinates when the boundary file is missing', function () {
    // Generate a unique path that does not refer to an existing file.
    $missingPath = sys_get_temp_dir()
        .DIRECTORY_SEPARATOR
        .'missing-kalyewatch-boundary-'
        .bin2hex(random_bytes(8))
        .'.geojson';

    expect(
        (new PanghuloBoundary($missingPath))->contains(14.6872, 120.9547)
    )->toBeFalse();
});

test('rejects invalid GeoJSON content', function () {
    $path = createKalyewatchBoundaryTestFile('{ invalid GeoJSON content');

    try {
        expect(
            (new PanghuloBoundary($path))->contains(14.6872, 120.9547)
        )->toBeFalse();
    } finally {
        removeKalyewatchBoundaryTestFile($path);
    }
});

test('rejects unsupported GeoJSON geometry types', function () {
    $geoJson = <<<'JSON'
    {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "Point",
                    "coordinates": [120.5, 14.5]
                }
            }
        ]
    }
    JSON;

    $path = createKalyewatchBoundaryTestFile($geoJson);

    try {
        expect(
            (new PanghuloBoundary($path))->contains(14.5, 120.5)
        )->toBeFalse();
    } finally {
        removeKalyewatchBoundaryTestFile($path);
    }
});
