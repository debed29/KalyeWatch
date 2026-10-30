import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';

type Reporter = {
    id: number;
    name: string;
    email: string;
};
// Information about an image attached to an incident report.
type IncidentImage = {
    id: number;
    incident_id: number;
    path: string;
    mime_type: string;
    size_bytes: number;
};
type Incident = {
    id: number;
    category: string;
    incident_date: string;
    incident_time: string | null;
    location_description: string;
    description: string;
    source_type: string;
    status: string;
    severity: string | null;
    created_at: string;
    reporter: Reporter;
    // Evidence images uploaded by the person who submitted the report.
    images: IncidentImage[];
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    incidents: {
        data: Incident[];
        links: PaginationLink[];
        total: number;
        from: number | null;
        to: number | null;
    };
};

type SharedPageProps = {
    errors?: Record<string, string>;
    flash?: {
        success?: string;
    };
};

function IncidentReviewCard({ incident }: { incident: Incident }) {
    const page = usePage();
    const sharedProps = page.props as typeof page.props & SharedPageProps;
    const incidentError = sharedProps.errors?.incident;

    const verifyForm = useForm({
        severity: incident.severity ?? 'Moderate',
    });

    const rejectForm = useForm({
        rejection_reason: '',
    });

    function verify(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        verifyForm.post(`/admin/incidents/${incident.id}/verify`, {
            preserveScroll: true,
        });
    }

    function reject(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        rejectForm.post(`/admin/incidents/${incident.id}/reject`, {
            preserveScroll: true,
        });
    }

    return (
        <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
            {incidentError && (
                <div
                    role="alert"
                    className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                >
                    {incidentError}
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                        Report #{incident.id}
                    </p>

                    <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {incident.category}
                    </h2>
                </div>

                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                    {incident.status.replaceAll('_', ' ')}
                </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Submitted by
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {incident.reporter?.name ?? 'Unknown user'}
                    </p>

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {incident.reporter?.email ?? 'No email available'}
                    </p>
                </div>

                <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Incident date
                    </p>

                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                        {new Date(
                            `${incident.incident_date.slice(0, 10)}T00:00:00`,
                        ).toLocaleDateString('en-PH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                        })}
                    </p>

                    {incident.incident_time && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Time: {incident.incident_time}
                        </p>
                    )}

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {incident.location_description}
                    </p>
                </div>
            </div>

            <div className="mt-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Incident description
                </p>

                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                    {incident.description}
                </p>
            </div>
                        {/* Display private evidence images attached to this incident. */}
            <div className="mt-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Evidence Images ({incident.images?.length ?? 0})
                </h3>

                {incident.images && incident.images.length > 0 ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {incident.images.map((image) => {
                            // Use the protected admin route instead of exposing storage paths.
                            const imageUrl = `/admin/incidents/${incident.id}/evidence/${image.id}`;

                            return (
                                <a
                                    key={image.id}
                                    href={imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                                    title="Open evidence image"
                                >
                                    <img
                                        src={imageUrl}
                                        alt={`Evidence for incident #${incident.id}`}
                                        className="h-36 w-full object-cover transition duration-200 group-hover:scale-105"
                                        loading="lazy"
                                    />
                                    <div className="bg-gray-50 px-2 py-2 text-center text-xs text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                                        View evidence
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                ) : (
                    <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                        No evidence images attached to this report.
                    </p>
                )}
            </div>
            <form
                onSubmit={verify}
                className="mt-5 space-y-3 border-t border-gray-200 pt-5 dark:border-gray-800"
            >
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                    Assign severity before verification
                    <select
                        value={verifyForm.data.severity}
                        onChange={(event) =>
                            verifyForm.setData('severity', event.target.value)
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                        <option value="Low">Low</option>
                        <option value="Moderate">Moderate</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                    </select>
                </label>

                {verifyForm.errors.severity && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {verifyForm.errors.severity}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={verifyForm.processing || rejectForm.processing}
                    className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {verifyForm.processing
                        ? 'Verifying...'
                        : 'Verify and Publish'}
                </button>
            </form>

            <form onSubmit={reject} className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                    Rejection reason
                    <textarea
                        value={rejectForm.data.rejection_reason}
                        onChange={(event) =>
                            rejectForm.setData(
                                'rejection_reason',
                                event.target.value,
                            )
                        }
                        rows={3}
                        minLength={5}
                        maxLength={1000}
                        placeholder="Explain why this report should be rejected."
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        required
                    />
                </label>

                {rejectForm.errors.rejection_reason && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                        {rejectForm.errors.rejection_reason}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={rejectForm.processing || verifyForm.processing}
                    className="w-full rounded-lg border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900 dark:bg-gray-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                    {rejectForm.processing ? 'Rejecting...' : 'Reject Report'}
                </button>
            </form>
        </article>
    );
}

export default function AdminIncidentReview({ incidents }: Props) {
    const page = usePage();
    const sharedProps = page.props as typeof page.props & SharedPageProps;
    const success = sharedProps.flash?.success;

    return (
        <>
            <Head title="Incident Review | KalyeWatch" />

            <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
                <header>
                    <p className="text-sm font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
                        Administration
                    </p>

                    <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        Incident Review
                    </h1>

                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Review community submissions before publishing verified
                        safety information.
                    </p>
                </header>

                {success && (
                    <div
                        role="status"
                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    >
                        {success}
                    </div>
                )}

                <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Reports awaiting review
                        </p>

                        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                            {incidents.total}
                        </p>
                    </div>

                    <Link
                        href="/incidents"
                        className="text-sm font-medium text-emerald-700 underline underline-offset-4 dark:text-emerald-400"
                    >
                        My Reports
                    </Link>
                </section>

                {incidents.data.length === 0 ? (
                    <section className="rounded-xl border border-gray-200 bg-white px-5 py-16 text-center dark:border-gray-800 dark:bg-gray-950">
                        <h2 className="font-semibold text-gray-900 dark:text-white">
                            No reports awaiting review
                        </h2>

                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            New pending submissions will appear here.
                        </p>
                    </section>
                ) : (
                    <section className="space-y-5">
                        {incidents.data.map((incident) => (
                            <IncidentReviewCard
                                key={incident.id}
                                incident={incident}
                            />
                        ))}
                    </section>
                )}

                {incidents.links.length > 3 && (
                    <nav
                        aria-label="Review pagination"
                        className="flex flex-wrap justify-center gap-2"
                    >
                        {incidents.links.map((link, index) => {
                            const label = link.label
                                .replace('&laquo;', '')
                                .replace('&raquo;', '')
                                .replace(/<[^>]*>/g, '')
                                .trim();

                            const className = `rounded-md border px-3 py-2 text-sm ${
                                link.active
                                    ? 'border-emerald-700 bg-emerald-700 text-white'
                                    : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300'
                            }`;

                            return link.url ? (
                                <Link
                                    key={`${label}-${index}`}
                                    href={link.url}
                                    preserveScroll
                                    className={className}
                                >
                                    {label}
                                </Link>
                            ) : (
                                <span
                                    key={`${label}-${index}`}
                                    className={`${className} cursor-not-allowed opacity-50`}
                                >
                                    {label}
                                </span>
                            );
                        })}
                    </nav>
                )}
            </main>
        </>
    );
}
