import { Head } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LayerGroup, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Represents the street geometry returned by Laravel.
type StreetGeometry =
    | {
          type: 'LineString';
          coordinates: number[][];
      }
    | {
          type: 'MultiLineString';
          coordinates: number[][][];
      };

// Contains aggregated verified incident statistics for one street.
type StreetStatistics = {
    total: number;
    categories: Record<string, number>;
    severities: Record<string, number>;
    recent_dates: string[];
};

// Represents one street feature from the Panghulo GeoJSON file.
type Street = {
    name: string;
    road_type: string;
    geometry: StreetGeometry;
    statistics: StreetStatistics;
};

type Props = {
    streets: Street[];
    totalVerifiedIncidents: number;
};

// Initial map position: Barangay Panghulo, Malabon City.
const CENTER: [number, number] = [14.6872, 120.9547];

const SEVERITIES = ['Low', 'Moderate', 'High', 'Critical', 'Not assigned'];

// Choose a heat color based on verified incident count.
function getStreetColor(total: number): string {
    if (total === 0) return '#64748b';
    if (total === 1) return '#eab308';
    if (total <= 4) return '#f97316';

    return '#dc2626';
}

// Convert GeoJSON coordinates into Leaflet latitude/longitude coordinates.
function getStreetPoints(geometry: StreetGeometry): [number, number][][] {
    const segments =
        geometry.type === 'LineString'
            ? [geometry.coordinates]
            : geometry.coordinates;

    return segments.map((segment) =>
        segment.map(([longitude, latitude]): [number, number] => [
            latitude,
            longitude,
        ]),
    );
}

export default function SafetyMap({ streets, totalVerifiedIncidents }: Props) {
    const mapElement = useRef<HTMLDivElement>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const streetLayerRef = useRef<LayerGroup | null>(null);

    const [mapReady, setMapReady] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Search and filter controls.
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedSeverity, setSelectedSeverity] = useState('all');

    // Remember the selected street.
    const [selectedStreetName, setSelectedStreetName] = useState<string | null>(
        null,
    );

    // Build category options using actual street statistics.
    const categories = useMemo(() => {
        return [
            ...new Set(
                streets.flatMap((street) =>
                    Object.keys(street.statistics.categories),
                ),
            ),
        ].sort((a, b) => a.localeCompare(b));
    }, [streets]);

    // Apply search and statistics filters.
    const filteredStreets = useMemo(() => {
        const searchTerm = search.trim().toLowerCase();

        return streets.filter((street) => {
            const matchesSearch =
                searchTerm === '' ||
                street.name.toLowerCase().startsWith(searchTerm);

            const matchesCategory =
                selectedCategory === 'all' ||
                (street.statistics.categories[selectedCategory] ?? 0) > 0;

            const matchesSeverity =
                selectedSeverity === 'all' ||
                (street.statistics.severities[selectedSeverity] ?? 0) > 0;

            return matchesSearch && matchesCategory && matchesSeverity;
        });
    }, [streets, search, selectedCategory, selectedSeverity]);

    // Show matching street suggestions while typing.
    const streetSuggestions = useMemo(() => {
        if (!search.trim()) return [];

        return filteredStreets.slice(0, 6);
    }, [filteredStreets, search]);

    // Find the selected street.
    const selectedStreet = useMemo(() => {
        if (!selectedStreetName) return null;

        return (
            filteredStreets.find(
                (street) => street.name === selectedStreetName,
            ) ?? null
        );
    }, [filteredStreets, selectedStreetName]);

    // Reset search and filters.
    function resetFilters() {
        setSearch('');
        setSelectedCategory('all');
        setSelectedSeverity('all');
        setSelectedStreetName(null);
    }

    // Enter or leave browser fullscreen mode.
    async function toggleFullscreen() {
        const fullscreenContainer = mapElement.current?.parentElement;

        if (!fullscreenContainer) return;

        try {
            if (!document.fullscreenElement) {
                await fullscreenContainer.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch {
            setMapError('Fullscreen mode is not available in this browser.');
        }
    }

    // Synchronize React state with the browser fullscreen controls.
    useEffect(() => {
        function handleFullscreenChange() {
            const fullscreenContainer = mapElement.current?.parentElement;

            setIsFullscreen(document.fullscreenElement === fullscreenContainer);

            // Leaflet needs to recalculate its dimensions after fullscreen.
            window.setTimeout(() => {
                mapRef.current?.invalidateSize({ pan: false });
            }, 150);

            window.setTimeout(() => {
                mapRef.current?.invalidateSize({ pan: false });
            }, 500);
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener(
                'fullscreenchange',
                handleFullscreenChange,
            );
        };
    }, []);

    // Initialize the Leaflet map once when the page loads.
    useEffect(() => {
        let cancelled = false;
        let createdMap: LeafletMap | null = null;

        async function initializeMap() {
            const L = await import('leaflet');

            if (cancelled || !mapElement.current) return;

            // Create the map. Leaflet adds its own container classes.
            createdMap = L.map(mapElement.current, {
                scrollWheelZoom: true,
                zoomControl: true,
                preferCanvas: false,
                zoomAnimation: true,
            });

            // Load the OpenStreetMap background tiles.
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 20,
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
            }).addTo(createdMap);

            // Create a separate layer for selectable street lines.
            streetLayerRef.current = L.layerGroup().addTo(createdMap);
            mapRef.current = createdMap;

            // Collect all street coordinates to determine the map bounds.
            const allLatLngs: [number, number][] = [];

            streets.forEach((street) => {
                getStreetPoints(street.geometry).forEach((segment) => {
                    allLatLngs.push(...segment);
                });
            });

            // Focus the map on the actual Panghulo street geometry.
            if (allLatLngs.length > 0) {
                createdMap.fitBounds(L.latLngBounds(allLatLngs), {
                    padding: [30, 30],
                    maxZoom: 17,
                });
            } else {
                createdMap.setView(CENTER, 16);
            }

            setMapError(null);
            setMapReady(true);

            // Correct Leaflet dimensions after the browser has rendered it.
            requestAnimationFrame(() => {
                createdMap?.invalidateSize({ pan: false });
            });
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
            setMapReady(false);
            streetLayerRef.current = null;
            mapRef.current = null;
            createdMap?.remove();
        };
    }, [streets]);

    // Draw transparent street overlays while keeping a wide clickable area.
    useEffect(() => {
        let cancelled = false;

        async function updateStreetLayer() {
            const L = await import('leaflet');

            if (
                cancelled ||
                !mapReady ||
                !mapRef.current ||
                !streetLayerRef.current
            ) {
                return;
            }

            const layer = streetLayerRef.current;
            layer.clearLayers();

            filteredStreets.forEach((street) => {
                const isSelected = street.name === selectedStreetName;

                // Keep the existing heatmap color for each street.
                const color = isSelected
                    ? '#2563eb'
                    : getStreetColor(street.statistics.total);

                const segments = getStreetPoints(street.geometry);

                segments.forEach((points) => {
                    if (points.length < 2) return;

                    // Wide, almost invisible hit area makes streets easier to select.
                    // This layer remains interactive but does not obscure street labels.
                    const hitArea = L.polyline(points, {
                        color: color,
                        weight: 18,
                        opacity: 0.01,
                        lineCap: 'round',
                        lineJoin: 'round',
                        interactive: true,
                    });

                    hitArea.on('click', () => {
                        setSelectedStreetName(street.name);
                    });

                    hitArea.addTo(layer);

                    // Thin, transparent visible heatmap line.
                    // This keeps the original OpenStreetMap street names readable.
                    const visibleLine = L.polyline(points, {
                        color: color,
                        weight: isSelected ? 3.5 : 2.5,
                        opacity: isSelected ? 0.65 : 0.35,
                        lineCap: 'round',
                        lineJoin: 'round',
                        interactive: false,
                    });

                    visibleLine.addTo(layer);
                });
            });
        }

        updateStreetLayer().catch(() => {
            if (!cancelled) {
                setMapError('Unable to display the street geometry.');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [filteredStreets, mapReady, selectedStreetName]);

    // Zoom toward the selected street.
    useEffect(() => {
        let cancelled = false;

        async function focusSelectedStreet() {
            if (!selectedStreet || !mapRef.current) return;

            const L = await import('leaflet');

            if (cancelled || !mapRef.current) return;

            const points = getStreetPoints(selectedStreet.geometry).flat();

            if (points.length > 0) {
                mapRef.current.fitBounds(L.latLngBounds(points), {
                    padding: [70, 70],
                    maxZoom: 18,
                });
            }
        }

        // Handle any errors while focusing on the selected street.
        focusSelectedStreet().catch(() => {
            if (!cancelled) {
                setMapError('Unable to focus on the selected street.');
            }
        });
        return () => {
            cancelled = true;
        };
    }, [selectedStreet]);

    // Keep Leaflet sized correctly when the map container changes size.
    useEffect(() => {
        const element = mapElement.current;

        if (!element || !mapRef.current) return;

        const observer = new ResizeObserver(() => {
            mapRef.current?.invalidateSize({ pan: false });
        });

        observer.observe(element);

        return () => observer.disconnect();
    }, [mapReady]);

    return (
        <>
            <Head title="Public Safety Map | KalyeWatch" />

            {/* Leaflet fixes: target the map directly, not its tile containers. */}
            <style>{`
                .map-fullscreen {
                    position: relative;
                    width: 100%;
                }

                .map-fullscreen:fullscreen {
                    display: flex;
                    flex-direction: column;
                    width: 100vw;
                    height: 100vh;
                    max-width: none;
                    padding: 12px;
                    box-sizing: border-box;
                    background: #020617;
                }

                .map-fullscreen:fullscreen .map-canvas {
                    flex: 1 1 auto;
                    width: 100%;
                    height: 100% !important;
                    min-height: 0;
                }

                /* Leaflet adds leaflet-container during map initialization. */
                .map-canvas.leaflet-container {
                    width: 100%;
                    height: 560px;
                    background: #e5e7eb;
                    font-family: inherit;
                }

                @media (min-width: 640px) {
                    .map-canvas.leaflet-container {
                        height: 650px;
                    }
                }

                .map-fullscreen:fullscreen .map-canvas.leaflet-container {
                    height: 100% !important;
                }

                /*
                 * IMPORTANT:
                 * Tailwind's global image rule can shrink Leaflet tiles.
                 * Give the tile images their real dimensions.
                 */
                .map-canvas.leaflet-container img.leaflet-tile {
                    width: 256px !important;
                    height: 256px !important;
                    max-width: none !important;
                    max-height: none !important;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }

                /* Do not force width or height on Leaflet tile containers. */
                .map-canvas .leaflet-tile-pane {
                    z-index: 200;
                }

                .map-canvas .leaflet-overlay-pane {
                    z-index: 400;
                }

                .map-canvas .leaflet-control-zoom {
                    margin-top: 12px;
                    margin-left: 12px;
                }

                .map-canvas .leaflet-control-attribution {
                    font-size: 11px;
                }
            `}</style>
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
                        Explore streets and verified incident statistics in
                        Barangay Panghulo, Malabon City.
                    </p>
                </header>

                {/* Search and filter controls */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="mb-4">
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            Search and filter streets
                        </h2>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Find streets based on their names and verified
                            incident statistics.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Street search with autocomplete */}
                        <div>
                            <label
                                htmlFor="street-search"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Search street
                            </label>

                            <div className="relative">
                                <input
                                    id="street-search"
                                    type="search"
                                    value={search}
                                    onChange={(event) => {
                                        setSearch(event.target.value);
                                        setSelectedStreetName(null);
                                    }}
                                    placeholder="Type a street name (e.g. ca)..."
                                    autoComplete="off"
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                />

                                {streetSuggestions.length > 0 && (
                                    <ul className="absolute top-full left-0 z-[1100] mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-900">
                                        {streetSuggestions.map((street) => (
                                            <li key={street.name}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSearch(street.name);
                                                        setSelectedStreetName(
                                                            street.name,
                                                        );
                                                    }}
                                                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                                                >
                                                    <span>{street.name}</span>

                                                    <span className="text-xs text-gray-500">
                                                        {
                                                            street.statistics
                                                                .total
                                                        }{' '}
                                                        incident(s)
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {search.trim() !== '' &&
                                    streetSuggestions.length === 0 && (
                                        <div className="absolute top-full left-0 z-[1100] mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-500 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                                            No matching street found.
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* Incident category filter */}
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
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                                <option value="all">All categories</option>

                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Severity filter */}
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
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
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

                    {/* Filter result count and reset */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Showing{' '}
                            <strong className="text-gray-900 dark:text-white">
                                {filteredStreets.length}
                            </strong>{' '}
                            of {streets.length} street features
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

                {/* Interactive street map */}
                <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5 dark:border-gray-800">
                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                Interactive street heatmap
                            </h2>

                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Drag to move, zoom to explore, or tap a street
                                to view its statistics.
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

                    {/* Fullscreen container */}
                    <div className="map-fullscreen relative">
                        {/* Fullscreen button */}
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="absolute top-3 right-3 z-[1000] rounded-lg border border-gray-300 bg-white/95 px-3 py-2 text-sm font-semibold text-gray-800 shadow-lg transition hover:bg-white"
                            aria-label={
                                isFullscreen
                                    ? 'Exit fullscreen map'
                                    : 'View map fullscreen'
                            }
                        >
                            {isFullscreen ? 'Exit fullscreen' : '⛶ Fullscreen'}
                        </button>

                        {/* Leaflet creates its own leaflet-container class. */}
                        <div
                            ref={mapElement}
                            aria-label="Interactive street safety heatmap of Barangay Panghulo"
                            className="map-canvas w-full"
                            tabIndex={0}
                        />

                        {/* Floating street information panel */}
                        <aside
                            className={`absolute bottom-4 left-4 z-[900] w-[min(370px,calc(100%-2rem))] overflow-y-auto rounded-xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-950/95 ${
                                isFullscreen ? 'max-h-[55vh]' : 'max-h-[48%]'
                            }`}
                            aria-live="polite"
                        >
                            {selectedStreet ? (
                                <>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                                                Selected street
                                            </p>

                                            <h3 className="mt-1 text-base font-bold text-gray-900 dark:text-white">
                                                {selectedStreet.name}
                                            </h3>

                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Road type:{' '}
                                                {selectedStreet.road_type}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedStreetName(null)
                                            }
                                            className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                        >
                                            Clear
                                        </button>
                                    </div>

                                    {/* Total verified incidents */}
                                    <div className="mt-3 rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                            Total verified incidents
                                        </p>

                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {selectedStreet.statistics.total}
                                        </p>
                                    </div>

                                    {/* Category and severity breakdown */}
                                    <div className="mt-3 grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                                                Categories
                                            </h4>

                                            {Object.entries(
                                                selectedStreet.statistics
                                                    .categories,
                                            ).length === 0 ? (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    None recorded
                                                </p>
                                            ) : (
                                                <ul className="mt-1 space-y-1">
                                                    {Object.entries(
                                                        selectedStreet
                                                            .statistics
                                                            .categories,
                                                    ).map(
                                                        ([category, total]) => (
                                                            <li
                                                                key={category}
                                                                className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-300"
                                                            >
                                                                <span>
                                                                    {category}
                                                                </span>
                                                                <strong>
                                                                    {total}
                                                                </strong>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                                                Severity
                                            </h4>

                                            {Object.entries(
                                                selectedStreet.statistics
                                                    .severities,
                                            ).length === 0 ? (
                                                <p className="mt-1 text-xs text-gray-500">
                                                    None recorded
                                                </p>
                                            ) : (
                                                <ul className="mt-1 space-y-1">
                                                    {Object.entries(
                                                        selectedStreet
                                                            .statistics
                                                            .severities,
                                                    ).map(
                                                        ([severity, total]) => (
                                                            <li
                                                                key={severity}
                                                                className="flex justify-between gap-2 text-xs text-gray-600 dark:text-gray-300"
                                                            >
                                                                <span>
                                                                    {severity}
                                                                </span>
                                                                <strong>
                                                                    {total}
                                                                </strong>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    {/* Recent incident dates */}
                                    <div className="mt-3 border-t border-gray-200 pt-2 dark:border-gray-700">
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                                            Recent incident dates
                                        </h4>

                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {selectedStreet.statistics
                                                .recent_dates.length > 0 ? (
                                                selectedStreet.statistics.recent_dates.map(
                                                    (date) => (
                                                        <span
                                                            key={date}
                                                            className="rounded-full bg-gray-100 px-2 py-1 text-[10px] text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                                        >
                                                            {date}
                                                        </span>
                                                    ),
                                                )
                                            ) : (
                                                <span className="text-xs text-gray-500">
                                                    No dates available
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                        Street information
                                    </h3>

                                    <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">
                                        Tap a colored street line to view its
                                        verified incident statistics. The
                                        clickable area is wider than the visible
                                        line to make selection easier.
                                    </p>

                                    <p className="mt-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                        {totalVerifiedIncidents} verified
                                        incident(s) across Panghulo
                                    </p>
                                </>
                            )}
                        </aside>
                    </div>
                    {/* Incident density legend */}
                    <div className="flex flex-wrap gap-4 border-t border-gray-200 p-4 text-xs text-gray-600 dark:border-gray-800 dark:text-gray-400">
                        <span className="font-semibold text-gray-900 dark:text-white">
                            Incident density:
                        </span>

                        <span>
                            <span className="mr-1 inline-block h-3 w-3 rounded-full bg-slate-500" />
                            No incidents
                        </span>

                        <span>
                            <span className="mr-1 inline-block h-3 w-3 rounded-full bg-yellow-500" />
                            1 incident
                        </span>

                        <span>
                            <span className="mr-1 inline-block h-3 w-3 rounded-full bg-orange-500" />
                            2–4 incidents
                        </span>

                        <span>
                            <span className="mr-1 inline-block h-3 w-3 rounded-full bg-red-600" />
                            5+ incidents
                        </span>

                        <span>
                            <span className="mr-1 inline-block h-3 w-3 rounded-full bg-blue-600" />
                            Selected street
                        </span>
                    </div>
                </section>

                {/* Overall verified incident count */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total verified incidents across Barangay Panghulo
                    </p>

                    <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                        {totalVerifiedIncidents}
                    </p>
                </section>

                {/* Privacy and attribution notice */}
                <footer className="rounded-lg bg-gray-100 p-4 text-xs leading-5 text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                    Map data © OpenStreetMap contributors. Only aggregated
                    verified incident statistics are displayed. Exact incident
                    coordinates, reporter identities, and private evidence are
                    not shown. This map supports safety awareness and does not
                    replace emergency services.
                </footer>
            </main>
        </>
    );
}
