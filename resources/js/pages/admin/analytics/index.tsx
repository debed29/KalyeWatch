import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import {
    AlertTriangle,
    BarChart3,
    CalendarDays,
    CheckCircle2,
    Clock3,
    FileText,
    MapPin,
    ShieldAlert,
} from 'lucide-react';

// Data returned by IncidentAnalyticsController.
type AnalyticsFilters = {
    from: string;
    to: string;
};

type AnalyticsStats = {
    totalReports: number;
    pendingReports: number;
    verifiedIncidents: number;
    rejectedReports: number;
    highSeverityIncidents: number;
};

type MonthlyTrend = {
    month: string;
    label: string;
    total: number;
};

type CategoryBreakdown = {
    category: string;
    total: number;
};

type SeverityBreakdown = {
    severity: string;
    total: number;
};

type TopLocation = {
    location: string;
    total: number;
};

// All analytics information received from Laravel through Inertia.
type Props = {
    filters: AnalyticsFilters;
    stats: AnalyticsStats;
    monthlyTrend: MonthlyTrend[];
    categoryBreakdown: CategoryBreakdown[];
    severityBreakdown: SeverityBreakdown[];
    topLocations: TopLocation[];
};

// Format dates consistently for the page.
function formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

// Keep severity bar colors consistent.
function getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
        Low: 'bg-emerald-500',
        Moderate: 'bg-amber-500',
        High: 'bg-orange-500',
        Critical: 'bg-rose-600',
        'Not assigned': 'bg-slate-400',
    };

    return colors[severity] ?? 'bg-slate-400';
}

// Display the monthly incident trend using a simple SVG line chart.
function MonthlyTrendChart({ data }: { data: MonthlyTrend[] }) {
    const chartWidth = 640;
    const chartHeight = 230;

    const left = 38;
    const right = 615;
    const top = 20;
    const bottom = 165;

    const maximum = Math.max(1, ...data.map((item) => item.total));
    const horizontalStep = (right - left) / Math.max(1, data.length - 1);

    // Convert each monthly total into an SVG chart coordinate.
    const points = data.map((item, index) => {
        const x = left + index * horizontalStep;
        const y = bottom - (item.total / maximum) * (bottom - top);

        return {
            x,
            y,
            label: item.label,
            total: item.total,
        };
    });

    const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ');

    return (
        <div className="w-full overflow-x-auto">
            {data.length === 0 ? (
                <div className="flex h-56 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    No monthly data available for this date range.
                </div>
            ) : (
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    role="img"
                    aria-label="Monthly verified incident trend"
                    className="h-auto w-full min-w-[520px]"
                >
                    {/* Horizontal grid lines help compare monthly totals. */}
                    {[0, 1, 2, 3, 4].map((step) => {
                        const y = top + (step * (bottom - top)) / 4;

                        return (
                            <line
                                key={step}
                                x1={left}
                                y1={y}
                                x2={right}
                                y2={y}
                                stroke="currentColor"
                                opacity="0.12"
                                strokeDasharray="4 5"
                            />
                        );
                    })}

                    {/* The line connects each month's verified incident total. */}
                    {points.length > 1 && (
                        <polyline
                            points={linePoints}
                            fill="none"
                            stroke="#059669"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Display a circle for every month. */}
                    {points.map((point, index) => (
                        <g key={`${point.label}-${index}`}>
                            <circle
                                cx={point.x}
                                cy={point.y}
                                r="5"
                                fill="#059669"
                                stroke="white"
                                strokeWidth="2"
                            />

                            {/* Show the total above each data point. */}
                            <text
                                x={point.x}
                                y={Math.max(12, point.y - 12)}
                                textAnchor="middle"
                                fontSize="11"
                                fill="currentColor"
                            >
                                {point.total}
                            </text>

                            {/* Avoid overcrowding the month labels. */}
                            {(index === 0 ||
                                index === points.length - 1 ||
                                index % 3 === 0) && (
                                <text
                                    x={point.x}
                                    y={bottom + 24}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fill="currentColor"
                                    opacity="0.7"
                                >
                                    {point.label}
                                </text>
                            )}
                        </g>
                    ))}
                </svg>
            )}
        </div>
    );
}

// Reusable horizontal bar chart for categories and locations.

function BreakdownBars({
    items,
    color = 'bg-emerald-600',
}: {
    items: { label: string; total: number }[];
    color?: string;
}) {
    const maximum = Math.max(1, ...items.map((item) => item.total));

    if (items.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No verified incident records found for this date range.
            </p>
        );
    }

    return (
        <div className="space-y-5">
            {items.map((item, index) => {
                const width = (item.total / maximum) * 100;

                return (
                    <div key={`${item.label}-${index}`}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                                {item.label}
                            </span>

                            <span className="shrink-0 text-sm font-semibold text-gray-900 tabular-nums dark:text-white">
                                {item.total}
                            </span>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                                className={`h-full rounded-full transition-all ${color}`}
                                style={{ width: `${width}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function IncidentAnalytics({
    filters,
    stats,
    monthlyTrend,
    categoryBreakdown,
    severityBreakdown,
    topLocations,
}: Props) {
    // Keep the filter inputs synchronized with the dates returned by Laravel.
    const [from, setFrom] = useState(filters.from);
    const [to, setTo] = useState(filters.to);

    // Submit selected dates as GET parameters to the analytics route.
    function applyFilters(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        router.get(
            '/admin/analytics',
            { from, to },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    }

    // Summary cards include all report statuses in the selected date range.
    const statisticCards = [
        {
            title: 'Total Reports',
            value: stats.totalReports,
            description: 'All submitted reports',
            icon: FileText,
            iconStyle:
                'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
        },
        {
            title: 'Awaiting Review',
            value: stats.pendingReports,
            description: 'Pending and under review',
            icon: Clock3,
            iconStyle:
                'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
        },
        {
            title: 'Verified Incidents',
            value: stats.verifiedIncidents,
            description: 'Approved incident reports',
            icon: CheckCircle2,
            iconStyle:
                'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
        },
        {
            title: 'Rejected Reports',
            value: stats.rejectedReports,
            description: 'Reports not approved',
            icon: AlertTriangle,
            iconStyle:
                'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
        },
        {
            title: 'High Severity',
            value: stats.highSeverityIncidents,
            description: 'High and Critical verified incidents',
            icon: ShieldAlert,
            iconStyle:
                'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
        },
    ];

    return (
        <>
            <Head title="Incident Analytics | KalyeWatch" />

            <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6">
                {/* Page heading and administrator navigation. */}
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                            Administration
                        </p>

                        <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
                            Incident Analytics
                        </h1>

                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Analyze verified community incidents in Barangay
                            Panghulo, Malabon City.
                        </p>
                    </div>

                    <Link
                        href="/admin/incidents"
                        className="inline-flex w-fit items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        <FileText className="h-4 w-4" />
                        Review Reports
                    </Link>
                </header>

                {/* Select the incident date range used by the analytics. */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="mb-4 flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />

                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            Filter by Incident Date
                        </h2>
                    </div>

                    <form
                        onSubmit={applyFilters}
                        className="flex flex-col items-end gap-4 sm:flex-row"
                    >
                        <div className="w-full flex-1">
                            <label
                                htmlFor="from"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                From
                            </label>

                            <input
                                id="from"
                                type="date"
                                value={from}
                                max={to}
                                onChange={(event) =>
                                    setFrom(event.target.value)
                                }
                                required
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        <div className="w-full flex-1">
                            <label
                                htmlFor="to"
                                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                To
                            </label>

                            <input
                                id="to"
                                type="date"
                                value={to}
                                min={from}
                                onChange={(event) => setTo(event.target.value)}
                                required
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            />
                        </div>

                        <div className="flex w-full gap-2 sm:w-auto">
                            <button
                                type="submit"
                                className="flex-1 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:flex-none"
                            >
                                Apply Filter
                            </button>

                            <Link
                                href="/admin/analytics"
                                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Reset
                            </Link>
                        </div>
                    </form>

                    <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                        Showing incident dates from {formatDate(filters.from)}{' '}
                        to {formatDate(filters.to)}.
                    </p>
                </section>

                {/* Summary cards include pending, verified, and rejected reports. */}
                <section>
                    <div className="mb-3">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            Report Summary
                        </h2>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            All report statuses within the selected date range.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                        {statisticCards.map((card) => {
                            const Icon = card.icon;

                            return (
                                <article
                                    key={card.title}
                                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {card.title}
                                        </p>

                                        <span
                                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.iconStyle}`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </span>
                                    </div>

                                    <p className="mt-4 text-3xl font-bold text-gray-900 tabular-nums dark:text-white">
                                        {card.value.toLocaleString()}
                                    </p>

                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                        {card.description}
                                    </p>
                                </article>
                            );
                        })}
                    </div>
                </section>

                {/* Verified incidents are used for the charts below. */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="mb-5 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />

                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                Monthly Incident Trend
                            </h2>

                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Number of verified incidents per month.
                            </p>
                        </div>
                    </div>

                    <MonthlyTrendChart data={monthlyTrend} />
                </section>

                <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    {/* Category totals show which incident types are most common. */}
                    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <div className="mb-6">
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                Incident Categories
                            </h2>

                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Verified incidents grouped by category.
                            </p>
                        </div>

                        <BreakdownBars
                            items={categoryBreakdown.map((item) => ({
                                label: item.category,
                                total: item.total,
                            }))}
                            color="bg-emerald-600"
                        />
                    </article>

                    {/* Severity totals show the distribution of verified reports. */}
                    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <div className="mb-6">
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                Severity Distribution
                            </h2>

                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Verified incidents grouped by assigned severity.
                            </p>
                        </div>

                        <div className="space-y-5">
                            {severityBreakdown.map((item) => {
                                const maximum = Math.max(
                                    1,
                                    ...severityBreakdown.map(
                                        (entry) => entry.total,
                                    ),
                                );

                                const width = (item.total / maximum) * 100;

                                return (
                                    <div key={item.severity}>
                                        <div className="mb-2 flex items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                                {item.severity}
                                            </span>

                                            <span className="text-sm font-semibold text-gray-900 tabular-nums dark:text-white">
                                                {item.total}
                                            </span>
                                        </div>

                                        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                            <div
                                                className={`h-full rounded-full ${getSeverityColor(item.severity)}`}
                                                style={{
                                                    width: `${width}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </article>
                </section>

                {/* Show frequently entered street or landmark descriptions. */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    <div className="mb-6 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />

                        <div>
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                Top Reported Locations
                            </h2>

                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Most frequently entered location descriptions
                                among verified incidents.
                            </p>
                        </div>
                    </div>

                    <BreakdownBars
                        items={topLocations.map((item) => ({
                            label: item.location,
                            total: item.total,
                        }))}
                        color="bg-blue-600"
                    />
                </section>

                {/* Explain the difference between report counts and chart data. */}
                <footer className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                    <strong>Analytics note:</strong> Summary cards count all
                    reports in the selected date range. The monthly trend,
                    category breakdown, severity distribution, and top reported
                    locations use verified incidents only. Location descriptions
                    are entered by reporters and may refer to streets or
                    landmarks; they are not automatically standardized street
                    names.
                </footer>
            </main>
        </>
    );
}
