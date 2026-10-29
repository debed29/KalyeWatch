
import { Head } from '@inertiajs/react';
import { useState } from 'react';
import PendingInvitationsModal from '@/components/pending-invitations-modal';
import { dashboard } from '@/routes';
import type { DashboardInvitation } from '@/types';

type Props = {
    pendingInvitations?: DashboardInvitation[];
};


const stats = [
    {
        title: 'Total Reports',
        value: '—',
        description: 'All submitted incident reports',
        symbol: '▤',
        color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    },
    {
        title: 'Pending Review',
        value: '—',
        description: 'Reports awaiting verification',
        symbol: '◷',
        color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    },
    {
        title: 'Verified Incidents',
        value: '—',
        description: 'Approved for public display',
        symbol: '✓',
        color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    },
    {
        title: 'High Severity',
        value: '—',
        description: 'Incidents requiring attention',
        symbol: '!',
        color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    },
];

export default function Dashboard({
    pendingInvitations = [],
}: Props) {
    const [showInvitations, setShowInvitations] = useState(
        pendingInvitations.length > 0,
    );

    return (
        <>
            <Head title="KalyeWatch Dashboard" />

            <PendingInvitationsModal
                invitations={pendingInvitations}
                open={pendingInvitations.length > 0 && showInvitations}
                onOpenChange={setShowInvitations}
            />

            <main className="flex min-h-full flex-1 flex-col gap-6 p-4 text-gray-900 dark:text-gray-100 sm:p-6">
                <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                            Street safety awareness
                        </p>

                        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                            KalyeWatch Dashboard
                        </h1>

                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Monitor and organize community safety reports
                            in Barangay Panghulo, Malabon City.
                        </p>
                    </div>

                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Development preview
                    </span>
                </section>

                <section>
                    <div className="mb-3">
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                            Incident overview
                        </h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Statistics will appear after the incident
                            database is connected.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {stats.map((stat) => (
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
                                    {stat.value}
                                </p>

                                <p className="mt-2 text-xs leading-5 text-gray-600 dark:text-gray-400">
                                    {stat.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 xl:col-span-2">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Incident map
                                </h2>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                    Barangay Panghulo, Malabon City
                                </p>
                            </div>

                            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                Map integration pending
                            </span>
                        </div>

                        <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center transition-colors dark:border-gray-700 dark:bg-gray-800/70">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    className="h-8 w-8"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 21s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12Z"
                                    />
                                    <circle cx="12" cy="9" r="2.5" />
                                </svg>
                            </div>

                            <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                                Your community safety map
                            </h3>

                            <p className="mt-2 max-w-md text-sm leading-6 text-gray-600 dark:text-gray-300">
                                The interactive map will display verified
                                incidents, category filters, and approximate
                                locations after the mapping module is connected.
                            </p>

                            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                No incident locations are displayed yet.
                            </p>
                        </div>
                    </article>

                    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Recent reports
                        </h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Latest community submissions
                        </p>

                        <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-lg bg-gray-50 px-5 py-8 text-center dark:bg-gray-800">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-xl text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                ▤
                            </div>

                            <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                                No report data connected
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                Submitted reports will appear here once the
                                incident reporting module is implemented.
                            </p>
                        </div>
                    </article>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Development progress
                    </h2>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        The next modules to build for KalyeWatch.
                    </p>

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                Foundation
                            </p>
                            <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                                Authentication
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                Registration and login are set up for local testing.
                            </p>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                Next module
                            </p>
                            <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                                Incident reporting
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                Build the database, reporting form, and report history.
                            </p>
                        </div>

                        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                                Following module
                            </p>
                            <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                                Verification and mapping
                            </p>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                Review reports before showing verified incidents on the map.
                            </p>
                        </div>
                    </div>
                </section>

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
