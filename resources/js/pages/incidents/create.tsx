
import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import LocationPicker from '@/components/location-picker';

const categories = [
    'Theft or Robbery',
    'Harassment',
    'Physical Altercations',
    'Suspicious Activities',
    'Street Accidents',
];

export default function CreateIncident() {
    const [submitted, setSubmitted] = useState(false);

    const form = useForm({
        category: 'Theft or Robbery',
        incident_date: '',
        incident_time: '',
        location_description: '',
        description: '',
        latitude: '',
        longitude: '',
    });

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setSubmitted(false);

        form.post('/incidents', {
            onSuccess: () => {
                form.reset();
                setSubmitted(true);
            },
        });
    }

    const inputClass =
        'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';

    const labelClass =
        'block text-sm font-medium text-gray-800 dark:text-gray-200';

    return (
        <>
            <Head title="Submit Incident | KalyeWatch" />

            <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
                <header>
                    <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                        Community safety
                    </p>

                    <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                        Submit an Incident Report
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                        Provide accurate information about a street-safety
                        incident in Barangay Panghulo, Malabon City.
                    </p>
                </header>

                {submitted && (
                    <div
                        role="status"
                        className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                    >
                        Your report was submitted successfully and is pending
                        administrative review.
                    </div>
                )}

                <form
                    onSubmit={submit}
                    className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-7"
                >
                    <div>
                        <label htmlFor="category" className={labelClass}>
                            Incident category
                        </label>

                        <select
                            id="category"
                            value={form.data.category}
                            onChange={(e) =>
                                form.setData('category', e.target.value)
                            }
                            className={inputClass}
                            required
                        >
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>

                        {form.errors.category && (
                            <p className="mt-1 text-sm text-red-600">
                                {form.errors.category}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="incident_date" className={labelClass}>
                                Incident date
                            </label>

                            <input
                                id="incident_date"
                                type="date"
                                value={form.data.incident_date}
                                onChange={(e) =>
                                    form.setData('incident_date', e.target.value)
                                }
                                max={new Date().toLocaleDateString('en-CA')}
                                className={inputClass}
                                required
                            />

                            {form.errors.incident_date && (
                                <p className="mt-1 text-sm text-red-600">
                                    {form.errors.incident_date}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="incident_time" className={labelClass}>
                                Approximate time (optional)
                            </label>

                            <input
                                id="incident_time"
                                type="time"
                                value={form.data.incident_time}
                                onChange={(e) =>
                                    form.setData('incident_time', e.target.value)
                                }
                                className={inputClass}
                            />

                            {form.errors.incident_time && (
                                <p className="mt-1 text-sm text-red-600">
                                    {form.errors.incident_time}
                                </p>
                            )}
                        </div>
                    </div>
                    <LocationPicker
                       onSelect={(latitude, longitude) => {
                            form.setData('latitude', latitude.toFixed(7));
                             form.setData('longitude', longitude.toFixed(7));
                        }}
                    />

                    {form.data.latitude && form.data.longitude && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                           Selected coordinates: {form.data.latitude}, {form.data.longitude}
                      </p>
                    )}

                    {form.errors.latitude && (
                      <p className="text-sm text-rose-600">
                          {form.errors.latitude}
                        </p>
                    )}

                    {form.errors.longitude && (
                       <p className="text-sm text-rose-600">
                         {form.errors.longitude}
                        </p>
                    )}

                    <div>
                        <label
                            htmlFor="location_description"
                            className={labelClass}
                        >
                            Incident location
                        </label>

                        <input
                            id="location_description"
                            type="text"
                            value={form.data.location_description}
                            onChange={(e) =>
                                form.setData(
                                    'location_description',
                                    e.target.value,
                                )
                            }
                            placeholder="Street name or nearby landmark"
                            maxLength={255}
                            className={inputClass}
                            required
                        />

                        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            Enter the street or landmark in Barangay Panghulo.
                            Location-boundary validation will be added to the
                            reporting workflow.
                        </p>

                        {form.errors.location_description && (
                            <p className="mt-1 text-sm text-red-600">
                                {form.errors.location_description}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="description" className={labelClass}>
                            What happened?
                        </label>

                        <textarea
                            id="description"
                            value={form.data.description}
                            onChange={(e) =>
                                form.setData('description', e.target.value)
                            }
                            placeholder="Describe what you observed, including relevant details."
                            rows={5}
                            minLength={10}
                            maxLength={3000}
                            className={inputClass}
                            required
                        />

                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Do not include unnecessary personal details or
                            unsupported accusations.
                        </p>

                        {form.errors.description && (
                            <p className="mt-1 text-sm text-red-600">
                                {form.errors.description}
                            </p>
                        )}
                    </div>

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                        <strong>Before submitting:</strong> Reports are not
                        published immediately. An authorized administrator
                        must review and verify the information first.
                        KalyeWatch is not an emergency dispatch service.
                        Contact emergency authorities for immediate assistance.
                    </div>

                    <button
                        type="submit"
                        disabled={form.processing}
                        className="w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {form.processing
                            ? 'Submitting report...'
                            : 'Submit Incident Report'}
                    </button>

                    <div className="text-center">
                        <Link
                            href="/"
                            className="text-sm text-gray-600 underline underline-offset-4 hover:text-emerald-700 dark:text-gray-400 dark:hover:text-emerald-400"
                        >
                            Return to the home page
                        </Link>
                    </div>
                </form>
            </main>
        </>
    );
}
