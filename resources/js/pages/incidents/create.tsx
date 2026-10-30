
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

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
        images: [] as File[],
    });

    // Add selected images while enforcing file limits.
    function handleImageSelection(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const selectedFiles = Array.from(event.target.files ?? []);
        const currentFiles = form.data.images;

        const validFiles = selectedFiles.filter((file) => {
            const validType = [
                'image/jpeg',
                'image/png',
                'image/webp',
            ].includes(file.type);

            return validType && file.size <= MAX_FILE_SIZE;
        });

        const remainingSlots = MAX_IMAGES - currentFiles.length;
        const newFiles = validFiles.slice(0, remainingSlots);

        form.setData('images', [...currentFiles, ...newFiles]);

        // Reset the input so the same file can be selected again if removed.
        event.target.value = '';
    }

    // Remove a selected image before submission.
    function removeImage(index: number) {
        form.setData(
            'images',
            form.data.images.filter((_, i) => i !== index),
        );
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setSubmitted(false);

        form.post('/incidents', {
            forceFormData: true,
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
                    <p className="text-sm font-semibold tracking-widest text-emerald-700 uppercase dark:text-emerald-400">
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
                    className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 dark:border-gray-800 dark:bg-gray-950"
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
                            <label
                                htmlFor="incident_date"
                                className={labelClass}
                            >
                                Incident date
                            </label>

                            <input
                                id="incident_date"
                                type="date"
                                value={form.data.incident_date}
                                onChange={(e) =>
                                    form.setData(
                                        'incident_date',
                                        e.target.value,
                                    )
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
                            <label
                                htmlFor="incident_time"
                                className={labelClass}
                            >
                                Approximate time (optional)
                            </label>

                            <input
                                id="incident_time"
                                type="time"
                                value={form.data.incident_time}
                                onChange={(e) =>
                                    form.setData(
                                        'incident_time',
                                        e.target.value,
                                    )
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
                            Selected coordinates: {form.data.latitude},{' '}
                            {form.data.longitude}
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
                            The selected coordinates are checked against the
                            barangay boundary.
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

                    {/* Evidence photo upload section */}
                    <div>
                        <label htmlFor="images" className={labelClass}>
                            Evidence photos (optional)
                        </label>

                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Upload up to five photos. JPG, PNG, and WebP
                            formats are accepted. Maximum 5 MB per photo.
                        </p>

                        <input
                            id="images"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={handleImageSelection}
                            disabled={form.data.images.length >= MAX_IMAGES}
                            className={inputClass}
                        />

                        {form.data.images.length > 0 && (
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {form.data.images.map((image, index) => (
                                    <div
                                        key={`${image.name}-${index}`}
                                        className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                                    >
                                        <img
                                            src={URL.createObjectURL(image)}
                                            alt={`Evidence preview ${index + 1}`}
                                            className="h-32 w-full object-cover"
                                        />

                                        <div className="p-2">
                                            <p className="truncate text-xs text-gray-600 dark:text-gray-300">
                                                {image.name}
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="mt-1 text-xs font-medium text-red-600 hover:underline"
                                            >
                                                Remove photo
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {form.data.images.length} of {MAX_IMAGES} photos
                            selected.
                        </p>

                        {form.errors.images && (
                            <p className="mt-1 text-sm text-red-600">
                                {form.errors.images}
                            </p>
                        )}

                        {form.data.images.map((_, index) => {
                            const error =
                                form.errors[`images.${index}` as keyof typeof form.errors];

                            return error ? (
                                <p
                                    key={index}
                                    className="mt-1 text-sm text-red-600"
                                >
                                    Photo {index + 1}: {error}
                                </p>
                            ) : null;
                        })}
                    </div>

                    {form.progress && (
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Uploading: {form.progress.percentage}%
                            </p>

                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                                <div
                                    className="h-full bg-emerald-600 transition-all"
                                    style={{
                                        width: `${form.progress.percentage}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                        <strong>Before submitting:</strong> Reports are not
                        published immediately. An authorized administrator must
                        review and verify the information first. KalyeWatch is
                        not an emergency dispatch service. Contact emergency
                        authorities for immediate assistance.
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
