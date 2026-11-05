import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type SafetyIncident = {
    id: number;
    category: string;
    incident_date: string | null;
    severity: string | null;
    source_type: string;
    latitude: number | null;
    longitude: number | null;
    verified_at: string | null;
    approximate_area: string;
};

type Props = {
    incidents: SafetyIncident[];
};

const CENTER: [number, number] = [14.6872, 120.9547];

export default function SafetyMap({ incidents }: Props) {
    const mapElement = useRef<HTMLDivElement>(null);
    const [mapError, setMapError] = useState<string | null>(null);

    const mappedIncidents = incidents.filter(
        (incident) => incident.latitude !== null && incident.longitude !== null,
    );

    useEffect(() => {
        let map: LeafletMap | undefined;
        let cancelled = false;

        async function initializeMap() {
            const L = await import('leaflet');

            if (cancelled || !mapElement.current) {
                return;
            }

            map = L.map(mapElement.current, {
                scrollWheelZoom: false,
            }).setView(CENTER, 15);

            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            }).addTo(map);

            mappedIncidents.forEach((incident) => {
                if (
                    incident.latitude === null ||
                    incident.longitude === null ||
                    !map
                ) {
                    return;
                }

                const marker = L.circleMarker(
                    [incident.latitude, incident.longitude],
                    {
                        radius: 8,
                        color: '#047857',
                        weight: 2,
                        fillColor: '#34d399',
                        fillOpacity: 0.85,
                    },
                ).addTo(map);

                // Use text nodes instead of injecting report content as HTML.
                const popup = document.createElement('div');

                const heading = document.createElement('strong');
                heading.textContent = incident.category;

                const date = document.createElement('p');
                date.textContent = `Incident date: ${
                    incident.incident_date ?? 'Not available'
                }`;

                const severity = document.createElement('p');
                severity.textContent = `Severity: ${
                    incident.severity ?? 'Not assigned'
                }`;

                const area = document.createElement('p');
                area.textContent = incident.approximate_area;

                const source = document.createElement('p');
                source.textContent = `Reported by: ${incident.source_type}`;

                const note = document.createElement('small');
                note.textContent = 'Location is approximate.';

                popup.append(heading, date, severity, area, source, note);

                marker.bindPopup(popup);
            });

            if (mappedIncidents.length > 1) {
                const points = mappedIncidents.map(
                    (incident) =>
                        [
                            incident.latitude as number,
                            incident.longitude as number,
                        ] as [number, number],
                );

                map.fitBounds(L.latLngBounds(points).pad(0.25), {
                    maxZoom: 15,
                });
            } else if (mappedIncidents.length === 1) {
                const incident = mappedIncidents[0];

                if (incident.latitude !== null && incident.longitude !== null) {
                    map.setView([incident.latitude, incident.longitude], 15);
                }
            }

            setMapError(null);
        }

        initializeMap().catch(() => {
            if (!cancelled) {
                setMapError(
                    'The map could not load. Check your internet connection and refresh the page.',
                );
            }
        });

        return () => {
            cancelled = true;
            map?.remove();
        };
    }, [incidents]);

    return (
        <>
            <Head title="Public Safety Map | KalyeWatch" />

            <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
                <header>
                    <p className="text-sm font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                        Community safety
                    </p>

                    <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
                        Public Safety Map
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                        View verified street-safety reports for Barangay
                        Panghulo, Malabon City.
                    </p>
                </header>

                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                Incident locations
                            </h2>

                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {incidents.length} verified{' '}
                                {incidents.length === 1
                                    ? 'incident'
                                    : 'incidents'}
                            </p>
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Verified reports only
                        </span>
                    </div>

                    {mapError && (
                        <div
                            role="alert"
                            className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        >
                            {mapError}
                        </div>
                    )}

                    <div
                        ref={mapElement}
                        aria-label="Interactive safety map of Barangay Panghulo"
                        className="h-[420px] w-full bg-gray-100 sm:h-[520px] dark:bg-gray-900"
                    />

                    {incidents.length === 0 ? (
                        <div className="border-t border-gray-200 p-5 dark:border-gray-800">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                No verified incidents are currently available
                                for public display.
                            </p>
                        </div>
                    ) : mappedIncidents.length === 0 ? (
                        <div className="border-t border-gray-200 p-5 dark:border-gray-800">
                            <p className="text-sm leading-6 text-gray-600 dark:text-gray-400">
                                Verified reports are available, but their
                                coordinates have not been recorded. Map markers
                                will appear after location selection and
                                validation are implemented.
                            </p>
                        </div>
                    ) : null}
                </section>

                <section className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Verified incidents
                        </h2>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Reporter identities and full report descriptions are
                            not displayed publicly.
                        </p>
                    </div>

                    {incidents.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-950">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                There are no verified reports to display yet.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {incidents.map((incident) => (
                                <article
                                    key={incident.id}
                                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">
                                            {incident.category}
                                        </h3>

                                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                            Verified
                                        </span>
                                    </div>

                                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                        Incident date:{' '}
                                        {incident.incident_date ??
                                            'Not available'}
                                    </p>

                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                        Severity:{' '}
                                        {incident.severity ?? 'Not assigned'}
                                    </p>

                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                        Source: {incident.source_type}
                                    </p>

                                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                                        {incident.approximate_area}
                                    </p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                <footer className="rounded-lg bg-gray-100 p-4 text-xs leading-5 text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                    Map data © OpenStreetMap contributors. Locations are
                    generalized to protect privacy. This map supports safety
                    awareness and does not replace emergency services.
                </footer>
            </main>
        </>
    );
}
