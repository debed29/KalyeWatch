import { useEffect, useRef, useState } from 'react';
import type { CircleMarker, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
    onSelect: (latitude: number, longitude: number) => void;
};

const CENTER: [number, number] = [14.6872, 120.9547];

export default function LocationPicker({ onSelect }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<CircleMarker | null>(null);
    const callbackRef = useRef(onSelect);
    const [mapError, setMapError] = useState('');

    useEffect(() => {
        callbackRef.current = onSelect;
    }, [onSelect]);

    useEffect(() => {
        let cancelled = false;
        let localMap: LeafletMap | null = null;

        async function initialize() {
            try {
                const L = await import('leaflet');

                if (cancelled || !containerRef.current) {
                    return;
                }

                const map = L.map(containerRef.current).setView(CENTER, 15);
                localMap = map;
                mapRef.current = map;

                L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
                }).addTo(map);

                map.on('click', (event) => {
                    if (!markerRef.current) {
                        markerRef.current = L.circleMarker(event.latlng, {
                            radius: 9,
                            color: '#047857',
                            weight: 3,
                            fillColor: '#34d399',
                            fillOpacity: 0.9,
                        }).addTo(map);
                    } else {
                        markerRef.current.setLatLng(event.latlng);
                    }

                    callbackRef.current(event.latlng.lat, event.latlng.lng);
                });
            } catch {
                if (!cancelled) {
                    setMapError(
                        'Unable to load the map. Check your internet connection and refresh the page.',
                    );
                }
            }
        }

        void initialize();

        return () => {
            cancelled = true;
            localMap?.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
    }, []);

    return (
        <section className="space-y-2">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Select the incident location
            </p>

            <p className="text-sm leading-5 text-gray-600 dark:text-gray-400">
                Click the map to place a marker at the incident location. The
                server will check whether it falls inside the configured
                Panghulo boundary.
            </p>

            {mapError && (
                <p role="alert" className="text-sm text-rose-600">
                    {mapError}
                </p>
            )}

            <div
                ref={containerRef}
                aria-label="Map for selecting an incident location"
                className="h-80 w-full rounded-lg border border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-900"
            />
        </section>
    );
}
