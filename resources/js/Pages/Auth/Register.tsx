import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Head, Link, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const getStrength = (pwd: string) => {
        const checks = [
            pwd.length >= 8,
            /[A-Z]/.test(pwd),
            /[a-z]/.test(pwd),
            /[0-9]/.test(pwd),
            /[@$!%*?&#^()_+]/.test(pwd),
        ];
        return checks.filter(Boolean).length;
    };

    const strength = getStrength(data.password);

    const getStrengthColor = (s: number) => {
        if (s === 0) return 'bg-muted';
        if (s <= 2) return 'bg-destructive';
        if (s === 3) return 'bg-amber-500';
        return 'bg-green-500';
    };

    const getStrengthLabel = (s: number) => {
        if (s === 0) return '';
        if (s <= 2) return 'Weak';
        if (s === 3) return 'Fair';
        return 'Strong';
    };

    const getStrengthWidth = (s: number) => {
        if (s === 0) return 'w-0';
        if (s <= 2) return 'w-1/4';
        if (s === 3) return 'w-2/3';
        return 'w-full';
    };

    return (
        <GuestLayout>
            <Head title="Register — SecureVault" />

            <div className="flex min-h-screen items-center justify-center px-4">
                <div className="w-full max-w-md rounded-2xl border border-border bg-card px-8 py-10 shadow-sm">
                    {/* Amber top accent bar */}
                    <div className="mb-8 -mx-8 -mt-10 h-1 rounded-t-2xl bg-primary" />

                    <h1 className="text-2xl font-bold text-foreground">
                        Create Account
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Start managing your documents securely.
                    </p>

                    <form onSubmit={submit} className="mt-8 space-y-5">
                        {/* Full Name */}
                        <div>
                            <label
                                htmlFor="name"
                                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                                Full Name
                            </label>
                            <Input
                                id="name"
                                name="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="John Doe"
                                autoComplete="name"
                                autoFocus
                            />
                            {errors.name && (
                                <p className="mt-1.5 text-sm text-destructive">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        {/* Email Address */}
                        <div>
                            <label
                                htmlFor="email"
                                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    className="pl-9"
                                    value={data.email}
                                    onChange={(e) =>
                                        setData('email', e.target.value)
                                    }
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1.5 text-sm text-destructive">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Password Row */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Create Password */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        className="pr-10"
                                        value={data.password}
                                        onChange={(e) =>
                                            setData('password', e.target.value)
                                        }
                                        autoComplete="new-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label
                                    htmlFor="password_confirmation"
                                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                >
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="password_confirmation"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        name="password_confirmation"
                                        className="pr-10"
                                        value={data.password_confirmation}
                                        onChange={(e) =>
                                            setData('password_confirmation', e.target.value)
                                        }
                                        autoComplete="new-password"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Password Strength Indicator */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="h-1 w-full flex-1 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${getStrengthColor(strength)} ${getStrengthWidth(strength)}`}
                                    />
                                </div>
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12 text-right">
                                    {getStrengthLabel(strength)}
                                </span>
                            </div>
                            <p className="text-[10px] leading-relaxed text-muted-foreground">
                                Min. 8 characters · Uppercase · Lowercase · Number · Special character
                            </p>
                        </div>

                        {/* Errors for password (shared across both if validation returns them) */}
                        {errors.password && (
                            <p className="text-sm text-destructive">
                                {errors.password}
                            </p>
                        )}
                        {errors.password_confirmation && (
                            <p className="text-sm text-destructive">
                                {errors.password_confirmation}
                            </p>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="h-11 w-full bg-primary text-sm font-semibold uppercase tracking-wide text-primary-foreground"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Create Account
                                </>
                            )}
                        </Button>

                        {/* Footer link */}
                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link
                                href={route('login')}
                                className="text-primary hover:underline"
                            >
                                Log in
                            </Link>
                        </p>
                    </form>
                </div>
            </div>
        </GuestLayout>
    );
}
