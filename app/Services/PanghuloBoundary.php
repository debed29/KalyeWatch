<?php

namespace App\Services;

class PanghuloBoundary
{
    /**
     * Allow tests to supply a temporary boundary file.
     * The application uses the default resource file.
     */
    public function __construct(
        private readonly ?string $boundaryPath = null,
    ) {}

    /**
     * Check whether a point is inside the Panghulo boundary.
     */
    public function contains(float $latitude, float $longitude): bool
    {
        // Use the supplied path during tests or the application boundary by default.
        $path = $this->boundaryPath
            ?? resource_path('data/panghulo-boundary.geojson');

        // Stop if the boundary file does not exist.
        if (! is_file($path)) {
            return false;
        }

        // Read the GeoJSON boundary file.
        $json = file_get_contents($path);

        // Stop if PHP cannot read the boundary file.
        if ($json === false) {
            return false;
        }

        // Decode the GeoJSON content into a PHP array.
        $data = json_decode($json, true);

        if (! is_array($data)) {
            return false;
        }

        // Support both a single GeoJSON geometry and a FeatureCollection.
        $geometry = $data['geometry']
            ?? $data['features'][0]['geometry']
            ?? null;

        if (! is_array($geometry)) {
            return false;
        }

        // Support Polygon and MultiPolygon boundary geometries.
        $polygons = match ($geometry['type'] ?? null) {
            'Polygon' => [$geometry['coordinates'] ?? []],
            'MultiPolygon' => $geometry['coordinates'] ?? [],
            default => [],
        };

        foreach ($polygons as $polygon) {
            $rings = $polygon;

            // Skip polygons without a valid outer ring.
            if (! isset($rings[0]) || ! is_array($rings[0])) {
                continue;
            }

            // GeoJSON coordinates use [longitude, latitude] order.
            $outerRing = $rings[0];

            if ($this->pointIsInsideRing($longitude, $latitude, $outerRing)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether a coordinate is inside a GeoJSON polygon ring.
     *
     * @param  array<int, mixed>  $ring
     */
    private function pointIsInsideRing(
        float $longitude,
        float $latitude,
        array $ring
    ): bool {
        $inside = false;
        $count = count($ring);

        // A polygon ring must contain at least three points.
        if ($count < 3) {
            return false;
        }

        // Use the ray-casting algorithm to check whether the point is inside.
        for ($i = 0, $j = $count - 1; $i < $count; $j = $i++) {
            if (! isset(
                $ring[$i][0],
                $ring[$i][1],
                $ring[$j][0],
                $ring[$j][1]
            )) {
                continue;
            }

            $xi = (float) $ring[$i][0];
            $yi = (float) $ring[$i][1];
            $xj = (float) $ring[$j][0];
            $yj = (float) $ring[$j][1];

            $crosses = (($yi > $latitude) !== ($yj > $latitude))
                && (
                    $longitude
                    < ($xj - $xi)
                    * ($latitude - $yi)
                    / (($yj - $yi) ?: 0.0000000001)
                    + $xi
                );

            if ($crosses) {
                $inside = ! $inside;
            }
        }

        return $inside;
    }
}
