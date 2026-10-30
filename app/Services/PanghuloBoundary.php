<?php

namespace App\Services;

use RuntimeException;

class PanghuloBoundary
{
    public function contains(float $latitude, float $longitude): bool
    {
        $path = storage_path(
            'app/private/boundaries/panghulo.geojson'
        );

        if (! is_file($path)) {
            throw new RuntimeException(
                'The Panghulo boundary GeoJSON is missing. '
                .'Location validation cannot be performed.'
            );
        }

        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException('Unable to read the Panghulo boundary GeoJSON.');
        }

        /** @var mixed $data */
        $data = json_decode(
            $contents,
            true,
            512,
            JSON_THROW_ON_ERROR
        );

        if (! is_array($data)) {
            throw new RuntimeException('Boundary GeoJSON is invalid.');
        }

        $features = $data['features'] ?? [];

        if (! is_array($features) || count($features) !== 1) {
            throw new RuntimeException(
                'Expected one Panghulo boundary feature.'
            );
        }

        $geometry = $features[0]['geometry'] ?? null;

        if (! is_array($geometry)) {
            throw new RuntimeException('Boundary geometry is invalid.');
        }

        /** @var array{0: float, 1: float} $point */
        $point = [$longitude, $latitude];

        return match ($geometry['type'] ?? '') {
            'Polygon' => $this->insidePolygon(
                $point,
                $geometry['coordinates']
            ),
            'MultiPolygon' => $this->insideMultiPolygon(
                $point,
                $geometry['coordinates']
            ),
            default => throw new RuntimeException(
                'Unsupported Panghulo boundary geometry.'
            ),
        };
    }

    /**
     * @param  array{0: float, 1: float}  $point
     * @param  array<int, array<int, array<int, array{0: float, 1: float}>>>  $polygons
     */
    private function insideMultiPolygon(
        array $point,
        array $polygons
    ): bool {
        foreach ($polygons as $polygon) {
            if ($this->insidePolygon($point, $polygon)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array{0: float, 1: float}  $point
     * @param  array<int, array<int, array{0: float, 1: float}>>  $rings
     */
    private function insidePolygon(
        array $point,
        array $rings
    ): bool {
        if (empty($rings) || ! $this->insideRing($point, $rings[0])) {
            return false;
        }

        // Exclude any holes inside the polygon.
        foreach (array_slice($rings, 1) as $hole) {
            if ($this->insideRing($point, $hole)) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array{0: float, 1: float}  $point
     * @param  array<int, array{0: float, 1: float}>  $ring
     */
    private function insideRing(array $point, array $ring): bool
    {
        [$x, $y] = $point;
        $inside = false;
        $count = count($ring);

        if ($count < 3) {
            return false;
        }

        for ($i = 0, $j = $count - 1; $i < $count; $j = $i++) {
            $xi = (float) $ring[$i][0];
            $yi = (float) $ring[$i][1];
            $xj = (float) $ring[$j][0];
            $yj = (float) $ring[$j][1];

            // Treat points on the outer boundary as inside.
            if ($this->onSegment($x, $y, $xi, $yi, $xj, $yj)) {
                return true;
            }

            if (($yi > $y) !== ($yj > $y)) {
                $crossingX = ($xj - $xi) * ($y - $yi)
                    / ($yj - $yi) + $xi;

                if ($x < $crossingX) {
                    $inside = ! $inside;
                }
            }
        }

        return $inside;
    }

    private function onSegment(
        float $x,
        float $y,
        float $x1,
        float $y1,
        float $x2,
        float $y2
    ): bool {
        $cross = ($y - $y1) * ($x2 - $x1)
            - ($x - $x1) * ($y2 - $y1);

        if (abs($cross) > 1.0e-10) {
            return false;
        }

        $epsilon = 1.0e-10;

        return $x >= min($x1, $x2) - $epsilon
            && $x <= max($x1, $x2) + $epsilon
            && $y >= min($y1, $y2) - $epsilon
            && $y <= max($y1, $y2) + $epsilon;
    }
}
