
import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function Register() {
    // Keep the existing Laravel registration fields.
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    // Submit registration using the existing Laravel endpoint.
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post('/register', {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Register" />

            <form onSubmit={submit} className="flex flex-col gap-6">

                {/* Registration heading */}
                <div className="grid gap-2 text-center">
                    <h1 className="text-xl font-semibold tracking-tight">
                        Create your KalyeWatch account
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Join your community and help make Barangay Panghulo safer.
                    </p>
                </div>

                <div className="grid gap-5">

                    {/* Full name */}
                    <div className="grid gap-2">
                        <Label htmlFor="name">Full name</Label>

                        <Input
                            id="name"
                            type="text"
                            autoComplete="name"
                            placeholder="Enter your full name"
                            value={data.name}
                            onChange={(event) =>
                                setData('name', event.target.value)
                            }
                            required
                        />

                        <InputError message={errors.name} />
                    </div>

                    {/* Email address */}
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>

                        <Input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="email@example.com"
                            value={data.email}
                            onChange={(event) =>
                                setData('email', event.target.value)
                            }
                            required
                        />

                        <InputError message={errors.email} />
                    </div>

                    {/* Password */}
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>

                        <PasswordInput
                            id="password"
                            autoComplete="new-password"
                            placeholder="Create a password"
                            value={data.password}
                            onChange={(event) =>
                                setData('password', event.target.value)
                            }
                            required
                        />

                        <InputError message={errors.password} />
                    </div>

                    {/* Confirm password */}
                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">
                            Confirm password
                        </Label>

                        <PasswordInput
                            id="password_confirmation"
                            autoComplete="new-password"
                            placeholder="Confirm your password"
                            value={data.password_confirmation}
                            onChange={(event) =>
                                setData(
                                    'password_confirmation',
                                    event.target.value,
                                )
                            }
                            required
                        />
                    </div>

                    {/* Register button */}
                    <Button
                        type="submit"
                        className="mt-2 w-full"
                        disabled={processing}
                    >
                        {processing && <Spinner />}
                        Create Account
                    </Button>
                </div>

                {/* Login navigation */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>

                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                            Already registered?
                        </span>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    asChild
                >
                    <Link href="/login">
                        Log in to your account
                    </Link>
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                    By registering, you agree to help maintain a safer
                    community through responsible incident reporting.
                </p>
            </form>
        </>
    );
}

// Use the same shared authentication layout as the Login page.
Register.layout = {
    title: 'Create an account',
    description: 'Register to access KalyeWatch community safety features.',
};
