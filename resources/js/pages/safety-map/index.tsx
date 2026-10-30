
import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Represents an incident approved for public display.
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

// Initial map position: Barangay Panghulo, Malabon City.
const CENTER: [number, number] = [14.6872, 120.9547];

// Available severity levels.
const SEVERITIES = ['Low', 'Moderate', 'High', 'Critical'];

export default function SafetyMap({ incidents }: Props) {
    const mapElement = useRef<HTMLDivElement>(null);

    const [mapError, setMapError] = useState<string | null>(null);

    // Filter values selected by the visitor.
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedSeverity, setSelectedSeverity] = useState('all');

    // Build category options from the incidents received from Laravel.
    const categories = useMemo(() => {
        return [...new Set(incidents.map((incident) => incident.category))]
            .sort((a, b) => a.localeCompare(b));
    }, [incidents]);

    // Apply search, category, and severity filters.
    const filteredIncidents = useMemo(() => {
        const searchTerm = search.trim().toLowerCase();

        return incidents.filter((incident) => {
            const matchesSearch =
                searchTerm === '' ||
                incident.category.toLowerCase().includes(searchTerm);

            const matchesCategory =
                selectedCategory === 'all' ||
                incident.category === selectedCategory;

            const matchesSeverity =
                selectedSeverity === 'all' ||
                incident.severity === selectedSeverity;

            return (
                matchesSearch &&
                matchesCategory &&
                matchesSeverity
            );
        });
    }, [incidents, search, selectedCategory, selectedSeverity]);

    // Only incidents with valid coordinates can have map markers.
    const mappedIncidents = useMemo(() => {
        return filteredIncidents.filter(
            (incident) =>
                incident.latitude !== null &&
                incident.longitude !== null,
        );
    }, [filteredIncidents]);

    // Clear all active filters.
    function resetFilters() {
        setSearch('');
        setSelectedCategory('all');
        setSelectedSeverity('all');
    }

    // Initialize and update the Leaflet map whenever filters change.
    useEffect(() => {
        let map: LeafletMap | undefined;
        let cancelled = false;

        async function initializeMap() {
            const L = await import('leaflet');

            // Prevent map initialization after the component is removed.
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

            // Group incidents that share generalized coordinates.
            // This prevents overlapping markers from hiding one another.
            const coordinateGroups = new Map<string, SafetyIncident[]>();

            mappedIncidents.forEach((incident) => {
                if (
                    incident.latitude === null ||
                    incident.longitude === null
                ) {
                    return;
                }

                const key = `${incident.latitude},${incident.longitude}`;
                const existing = coordinateGroups.get(key) ?? [];

                existing.push(incident);
                coordinateGroups.set(key, existing);
            });

            const mapPoints: [number, number][] = [];

            coordinateGroups.forEach((group) => {
                const firstIncident = group[0];

                if (
                    firstIncident.latitude === null ||
                    firstIncident.longitude === null ||
                    !map
                ) {
                    return;
                }

                const coordinates: [number, number] = [
                    firstIncident.latitude,
                    firstIncident.longitude,
                ];

                mapPoints.push(coordinates);

                // Use one marker for each approximate coordinate.
                const marker = L.circleMarker(coordinates, {
                    radius: 9,
                    color: '#047857',
                    weight: 2,
                    fillColor: '#34d399',
                    fillOpacity: 0.85,
                }).addTo(map);

                // Create popup elements safely without injecting HTML.
                const popup = document.createElement('div');

                const heading = document.createElement('strong');
                heading.textContent =
                    group.length === 1
                        ? 'Verified incident'
                        : `${group.length} verified incidents in this approximate area`;

                popup.appendChild(heading);

                group.forEach((incident) => {
                    const divider = document.createElement('hr');
                    divider.style.margin = '8px 0';

                    const category = document.createElement('p');
                    category.textContent = incident.category;
                    category.style.fontWeight = '600';

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

                    popup.append(
                        divider,
                        category,
                        date,
                        severity,
                        area,
                    );
                });

                const note = document.createElement('small');
                note.textContent = 'Location is approximate.';

                popup.appendChild(note);
                marker.bindPopup(popup);
            });

            // Automatically adjust the map to the visible incidents.
            if (mapPoints.length > 1) {
                map.fitBounds(L.latLngBounds(mapPoints).pad(0.25), {
                    maxZoom: 15,
                });
            } else if (mapPoints.length === 1) {
                map.setView(mapPoints[0], 15);
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

        // Remove the previous map before creating a new one.
        return () => {
            cancelled = true;
            map?.remove();
        };
    }, [mappedIncidents]);

    return (
        <>
            <Head title="Public Safety Map | KalyeWatch" />

            <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
                {/* Page heading */}
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

                {/* Search and filter controls */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="mb-4">
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            Search and filter incidents
                        </h2>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Find verified incidents by category or severity.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Search by incident category */}
                        <div>
                            <label
                                htmlFor="incident-search"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Search category
                            </label>

                            <input
                                id="incident-search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search incidents..."
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        {/* Filter by incident category */}
                        <div>
                            <label
                                htmlFor="category-filter"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Incident category
                            </label>

                            <select
                                id="category-filter"
                                value={selectedCategory}
                                onChange={(event) =>
                                    setSelectedCategory(event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="all">All categories</option>

                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filter by severity */}
                        <div>
                            <label
                                htmlFor="severity-filter"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Severity level
                            </label>

                            <select
                                id="severity-filter"
                                value={selectedSeverity}
                                onChange={(event) =>
                                    setSelectedSeverity(event.target.value)
                                }
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-600 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="all">All severity levels</option>

                                {SEVERITIES.map((severity) => (
                                    <option key={severity} value={severity}>
                                        {severity}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Showing{' '}
                            <strong className="text-gray-900 dark:text-white">
                                {filteredIncidents.length}
                            </strong>{' '}
                            of {incidents.length} verified incidents
                        </p>

                        <button
                            type="button"
                            onClick={resetFilters}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                            Reset filters
                        </button>
                    </div>
                </section>

                {/* Interactive Leaflet map */}
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                Incident locations
                            </h2>

                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                {mappedIncidents.length} incidents with map
                                coordinates
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

                    {filteredIncidents.length === 0 ? (
                        <div className="border-t border-gray-200 p-5 dark:border-gray-800">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                No incidents match your selected filters.
                                Try changing your search or resetting the
                                filters.
                            </p>
                        </div>
                    ) : mappedIncidents.length === 0 ? (
                        <div className="border-t border-gray-200 p-5 dark:border-gray-800">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Verified reports are available, but their
                                coordinates have not been recorded.
                            </p>
                        </div>
                    ) : null}
                </section>

                {/* Filtered incident cards */}
                <section className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Verified incidents
                        </h2>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Reporter identities and full report descriptions
                            are not displayed publicly.
                        </p>
                    </div>

                    {filteredIncidents.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-950">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                No matching verified incidents found.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {filteredIncidents.map((incident) => (
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

                {/* Privacy and map attribution */}
                <footer className="rounded-lg bg-gray-100 p-4 text-xs leading-5 text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                    Map data © OpenStreetMap contributors. Locations are
                    generalized to protect privacy. This map supports safety
                    awareness and does not replace emergency services.
                </footer>
            </main>
        </>
    );
}
