import { Head } from '@inertiajs/react';

// Define the statistics returned by DashboardController.
type DashboardStats = {
    totalReports: number;
    pendingReview: number;
    verifiedIncidents: number;
    highSeverity: number;
};

// Define the structure of each recent incident report.
type RecentReport = {
    id: number;
    category: string;
    incidentDate: string;
    location: string;
    status: string;
    severity: string | null;
    reporterName: string | null;
};

// Define all properties received from Laravel through Inertia.
type Props = {
    stats: DashboardStats;
    recentReports: RecentReport[];
    isAdministrator: boolean;
    scopeLabel: string;
};

// Display dates in a readable format.
function formatDate(date: string): string {
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

// Display report status with an appropriate color.
function getStatusStyle(status: string): string {
    const styles: Record<string, string> = {
        pending:
            'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        under_review:
            'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
        verified:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
        rejected:
            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    };

    return (
        styles[status] ??
        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    );
}

// Format status labels for display.
function formatStatus(status: string): string {
    return status.replaceAll('_', ' ');
}

export default function Dashboard({
    stats,
    recentReports,
    isAdministrator,
    scopeLabel,
}: Props) {
    // Build the statistic cards using real database values.
    const statisticCards = [
        {
            title: 'Total Reports',
            value: stats.totalReports,
            description: isAdministrator
                ? 'All submitted incident reports'
                : 'Your submitted incident reports',
            symbol: '▤',
            color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
        },
        {
            title: 'Pending Review',
            value: stats.pendingReview,
            description: 'Reports awaiting review',
            symbol: '◷',
            color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
        },
        {
            title: 'Verified Incidents',
            value: stats.verifiedIncidents,
            description: 'Reports approved by administrators',
            symbol: '✓',
            color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
        },
        {
            title: 'High Severity',
            value: stats.highSeverity,
            description: 'High and Critical incidents',
            symbol: '!',
            color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
        },
    ];

    return (
        <>
            <Head title="KalyeWatch Dashboard" />

            <main className="flex min-h-full flex-1 flex-col gap-6 p-4 text-gray-900 sm:p-6 dark:text-gray-100">
                {/* Dashboard heading and navigation shortcuts. */}
                <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                            Street safety awareness
                        </p>

                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-white">
                            KalyeWatch Dashboard
                        </h1>

                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Monitor community safety reports in Barangay
                            Panghulo, Malabon City.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <a
                            href="/safety-map"
                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                            View Safety Map
                        </a>

                        <a
                            href="/incidents/create"
                            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                        >
                            Submit Report
                        </a>
                    </div>
                </section>

                {/* Show whether the statistics cover all reports or personal reports. */}
                <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
                    <div>
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                            Incident overview
                        </p>

                        <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                            {scopeLabel}
                        </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        {isAdministrator ? 'Administrator' : 'Community User'}
                    </span>
                </section>

                {/* Display live incident statistics from Laravel. */}
                <section>
                    <div className="mb-3">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            Incident statistics
                        </h2>

                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Current report totals based on your account access.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {statisticCards.map((stat) => (
                            <article
                                key={stat.title}
                                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                        {stat.title}
                                    </p>

                                    <span
                                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold ${stat.color}`}
                                    >
                                        {stat.symbol}
                                    </span>
                                </div>

                                <p className="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
                                    {stat.value.toLocaleString()}
                                </p>

                                <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-400">
                                    {stat.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Provide direct access to the interactive safety map and admin review queue. */}
                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <a
                        href="/safety-map"
                        className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900 dark:text-white">
                                Community Safety Map
                            </h2>

                            <span className="text-emerald-700 transition group-hover:translate-x-1 dark:text-emerald-400">
                                →
                            </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                            Explore verified street safety information and
                            incident locations in Barangay Panghulo.
                        </p>
                    </a>

                    {isAdministrator && (
                        <a
                            href="/admin/incidents"
                            className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-800"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900 dark:text-white">
                                    Incident Review Queue
                                </h2>

                                <span className="text-emerald-700 transition group-hover:translate-x-1 dark:text-emerald-400">
                                    →
                                </span>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                Review pending reports, assign severity, and
                                verify or reject submissions.
                            </p>
                        </a>
                    )}
                </section>

                {/* Display the five most recent reports returned by the backend. */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Recent Reports
                            </h2>

                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                Latest incident submissions
                            </p>
                        </div>

                        <a
                            href="/incidents"
                            className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                            View My Reports →
                        </a>
                    </div>

                    {recentReports.length === 0 ? (
                        // Display a helpful empty state when there are no reports.
                        <div className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-lg bg-gray-50 px-5 py-8 text-center dark:bg-gray-800">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-xl text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                ▤
                            </div>

                            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                                No reports yet
                            </h3>

                            <p className="mt-2 max-w-sm text-sm leading-6 text-gray-600 dark:text-gray-400">
                                Incident reports will appear here after they
                                have been submitted.
                            </p>
                        </div>
                    ) : (
                        // Show report information in a responsive list.
                        <div className="mt-5 space-y-3">
                            {recentReports.map((report) => (
                                <article
                                    key={report.id}
                                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
                                >
                                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                                {report.category}
                                            </h3>

                                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                {report.location}
                                            </p>

                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                Incident date:{' '}
                                                {formatDate(
                                                    report.incidentDate,
                                                )}
                                            </p>

                                            {isAdministrator &&
                                                report.reporterName && (
                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        Submitted by:{' '}
                                                        {report.reporterName}
                                                    </p>
                                                )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(report.status)}`}
                                            >
                                                {formatStatus(report.status)}
                                            </span>

                                            {report.severity && (
                                                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                    {report.severity}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                {/* Safety disclaimer. */}
                <footer className="rounded-lg bg-gray-100 px-4 py-3 text-xs leading-5 text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                    KalyeWatch supports community safety awareness and incident
                    information sharing. It does not replace emergency services.
                    Contact the appropriate emergency authorities for immediate
                    assistance.
                </footer>
            </main>
        </>
    );
}
