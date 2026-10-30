<?php

namespace App\Services;

use RuntimeException;

class PanghuloBoundary
{
    /**
     * Check whether a point is inside the Panghulo boundary.
     */
    public function contains(float $latitude, float $longitude): bool
    {
        $path = storage_path('app/private/boundaries/panghulo.geojson');

        if (! is_file($path)) {
            return false;
        }

        $data = json_decode(file_get_contents($path), true);

        if (! is_array($data)) {
            return false;
        }

        $geometry = $data['geometry'] ?? $data['features'][0]['geometry'] ?? null;

        if (! is_array($geometry)) {
            return false;
        }

        $polygons = match ($geometry['type'] ?? null) {
            'Polygon' => [$geometry['coordinates'] ?? []],
            'MultiPolygon' => $geometry['coordinates'] ?? [],
            default => [],
        };

        foreach ($polygons as $polygon) {
            $rings = $polygon;

            if (! isset($rings[0]) || ! is_array($rings[0])) {
                continue;
            }

            // GeoJSON coordinates are [longitude, latitude].
            $outerRing = $rings[0];

            if ($this->pointIsInsideRing($longitude, $latitude, $outerRing)) {
                return true;
            }
        }

        return false;
    }

    private function pointIsInsideRing(
        float $longitude,
        float $latitude,
        array $ring
    ): bool {
        $inside = false;
        $count = count($ring);

        if ($count < 3) {
            return false;
        }

        for ($i = 0, $j = $count - 1; $i < $count; $j = $i++) {
            if (! isset($ring[$i][0], $ring[$i][1], $ring[$j][0], $ring[$j][1])) {
                continue;
            }

            $xi = (float) $ring[$i][0];
            $yi = (float) $ring[$i][1];
            $xj = (float) $ring[$j][0];
            $yj = (float) $ring[$j][1];

            $crosses = (($yi > $latitude) !== ($yj > $latitude))
                && ($longitude < ($xj - $xi) * ($latitude - $yi) / (($yj - $yi) ?: 0.0000000001) + $xi);

            if ($crosses) {
                $inside = ! $inside;
            }
        }

        return $inside;
    }
}