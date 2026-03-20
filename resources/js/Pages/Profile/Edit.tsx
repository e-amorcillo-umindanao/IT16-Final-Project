import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    KeyRound,
    Monitor,
    Shield,
    ShieldAlert,
    ShieldCheck,
    User,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';

type RecentSession = {
    id: string;
    ip_address: string | null;
    last_activity: number;
    is_current: boolean;
};

type Props = PageProps<{
    mustVerifyEmail: boolean;
    status?: string;
    two_factor_enabled: boolean;
    session_count: number;
    recent_sessions: RecentSession[];
}>;

function formatSessionActivity(unixTimestamp: number) {
    return formatDistanceToNow(new Date(unixTimestamp * 1000), {
        addSuffix: true,
    });
}

function getPasswordStrength(password: string) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialCharacter = /[@$!%*?&#^()_+]/.test(password);
    const hasMinimumLength = password.length >= 8;
    const criteriaMet = [
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSpecialCharacter,
    ].filter(Boolean).length;

    if (!password) {
        return {
            label: 'None',
            barClassName: 'w-0 bg-transparent',
        };
    }

    if (hasMinimumLength && criteriaMet === 4) {
        return {
            label: 'Strong',
            barClassName: 'w-full bg-green-500',
        };
    }

    if (criteriaMet >= 3) {
        return {
            label: 'Fair',
            barClassName: 'w-2/4 bg-amber-500',
        };
    }

    return {
        label: 'Weak',
        barClassName: 'w-1/4 bg-destructive',
    };
}

export default function Edit({
    auth,
    two_factor_enabled,
    session_count,
    recent_sessions,
}: Props) {
    const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);

    const profileForm = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const passwordStrength = useMemo(
        () => getPasswordStrength(passwordForm.data.password),
        [passwordForm.data.password],
    );
    const passwordConfirmationError =
        passwordForm.errors.password_confirmation ||
        (passwordForm.errors.password?.toLowerCase().includes('confirmation')
            ? passwordForm.errors.password
            : undefined);
    const passwordFieldError =
        passwordForm.errors.password &&
        !passwordForm.errors.password.toLowerCase().includes('confirmation')
            ? passwordForm.errors.password
            : undefined;

    const submitProfile = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        profileForm.patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Profile updated successfully.');
            },
        });
    };

    const submitPassword = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        passwordForm.put(route('profile.password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                passwordForm.reset();
                toast.success('Password updated successfully.');
            },
        });
    };

    const disableTwoFactor = () => {
        router.delete(route('two-factor.destroy'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Two-factor authentication disabled.');
                setIsDisableDialogOpen(false);
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">
                        Profile Security
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Manage your personal information and account security.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Main &#8250; Profile
                    </p>
                </div>
            }
        >
            <Head title="Profile Security" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            <section className="rounded-lg border border-border bg-card p-6">
                                <div className="mb-6 flex items-center gap-2">
                                    <User size={18} className="text-primary" />
                                    <h3 className="font-semibold text-foreground">
                                        Profile Information
                                    </h3>
                                </div>

                                <form
                                    onSubmit={submitProfile}
                                    className="space-y-5"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            value={profileForm.data.name}
                                            onChange={(event) =>
                                                profileForm.setData(
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                            className="bg-background"
                                        />
                                        {profileForm.errors.name && (
                                            <p className="text-sm text-destructive">
                                                {profileForm.errors.name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">
                                            Email Address
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={profileForm.data.email}
                                            onChange={(event) =>
                                                profileForm.setData(
                                                    'email',
                                                    event.target.value,
                                                )
                                            }
                                            className="bg-background"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Changing your email will require
                                            re-verification.
                                        </p>
                                        {profileForm.errors.email && (
                                            <p className="text-sm text-destructive">
                                                {profileForm.errors.email}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={profileForm.processing}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                                        >
                                            Update Profile
                                        </Button>
                                    </div>
                                </form>
                            </section>

                            <section className="rounded-lg border border-border bg-card p-6">
                                <div className="mb-6 flex items-center gap-2">
                                    <KeyRound
                                        size={18}
                                        className="text-primary"
                                    />
                                    <h3 className="font-semibold text-foreground">
                                        Update Password
                                    </h3>
                                </div>

                                <form
                                    onSubmit={submitPassword}
                                    className="space-y-5"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="current_password">
                                            Current Password
                                        </Label>
                                        <Input
                                            id="current_password"
                                            type="password"
                                            value={
                                                passwordForm.data
                                                    .current_password
                                            }
                                            onChange={(event) =>
                                                passwordForm.setData(
                                                    'current_password',
                                                    event.target.value,
                                                )
                                            }
                                            className="bg-background"
                                        />
                                        {passwordForm.errors
                                            .current_password && (
                                            <p className="text-sm text-destructive">
                                                {
                                                    passwordForm.errors
                                                        .current_password
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">
                                            New Password
                                        </Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={passwordForm.data.password}
                                            onChange={(event) =>
                                                passwordForm.setData(
                                                    'password',
                                                    event.target.value,
                                                )
                                            }
                                            className="bg-background"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Must be at least 8 characters and
                                            include: uppercase, lowercase,
                                            number, and special character.
                                        </p>
                                        <div className="space-y-1.5">
                                            <div className="h-1 rounded-full bg-muted">
                                                <div
                                                    className={`h-1 rounded-full transition-all ${passwordStrength.barClassName}`}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Password strength:{' '}
                                                {passwordStrength.label}
                                            </p>
                                        </div>
                                        {passwordFieldError && (
                                            <p className="text-sm text-destructive">
                                                {passwordFieldError}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password_confirmation">
                                            Confirm New Password
                                        </Label>
                                        <Input
                                            id="password_confirmation"
                                            type="password"
                                            value={
                                                passwordForm.data
                                                    .password_confirmation
                                            }
                                            onChange={(event) =>
                                                passwordForm.setData(
                                                    'password_confirmation',
                                                    event.target.value,
                                                )
                                            }
                                            className="bg-background"
                                        />
                                        {passwordConfirmationError && (
                                            <p className="text-sm text-destructive">
                                                {passwordConfirmationError}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                            type="submit"
                                            disabled={passwordForm.processing}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                                        >
                                            Update Password
                                        </Button>
                                    </div>
                                </form>
                            </section>
                        </div>

                        <div className="space-y-6 lg:col-span-1">
                            <section
                                className={
                                    two_factor_enabled
                                        ? 'relative rounded-lg border border-green-500/20 bg-green-500/5 p-5'
                                        : 'relative rounded-lg border border-amber-500/30 bg-amber-500/10 p-5'
                                }
                            >
                                <div className="mb-4 flex items-start justify-between gap-4">
                                    <div
                                        className={
                                            two_factor_enabled
                                                ? 'inline-flex items-center gap-2 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold uppercase text-green-700 dark:text-green-400'
                                                : 'inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold uppercase text-amber-600 dark:text-amber-400'
                                        }
                                    >
                                        {!two_factor_enabled && (
                                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                                        )}
                                        {two_factor_enabled
                                            ? 'Protected'
                                            : 'Action Recommended'}
                                    </div>

                                    {two_factor_enabled ? (
                                        <ShieldCheck
                                            size={40}
                                            className="shrink-0 text-green-500"
                                        />
                                    ) : (
                                        <ShieldAlert
                                            size={40}
                                            className="shrink-0 text-amber-500"
                                        />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        Two-Factor Authentication
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {two_factor_enabled
                                            ? 'Your account is protected with TOTP-based 2FA.'
                                            : 'Add an extra layer of security. 2FA is currently disabled.'}
                                    </p>
                                </div>

                                <div className="mt-5">
                                    {two_factor_enabled ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() =>
                                                setIsDisableDialogOpen(true)
                                            }
                                        >
                                            Disable 2FA
                                        </Button>
                                    ) : (
                                        <Button
                                            asChild
                                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                                        >
                                            <Link href="/two-factor/setup">
                                                <Shield className="mr-2 h-4 w-4" />
                                                Enable 2FA
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </section>

                            <section className="rounded-lg border border-border bg-card p-5">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <h3 className="font-semibold text-foreground">
                                        Active Sessions
                                    </h3>
                                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                                        {session_count}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {recent_sessions.length > 0 ? (
                                        recent_sessions.map((session) => (
                                            <div
                                                key={session.id}
                                                className="flex items-start gap-3"
                                            >
                                                <div className="rounded bg-muted p-1.5">
                                                    <Monitor
                                                        size={16}
                                                        className="text-muted-foreground"
                                                    />
                                                </div>
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-foreground">
                                                            Web Session
                                                        </p>
                                                        {session.is_current && (
                                                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                                                                Current
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="font-mono text-xs text-muted-foreground">
                                                        IP:{' '}
                                                        {session.ip_address ??
                                                            'Unavailable'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Last active:{' '}
                                                        {formatSessionActivity(
                                                            session.last_activity,
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No active sessions found.
                                        </p>
                                    )}
                                </div>

                                <div className="mt-5">
                                    <Link
                                        href="/sessions"
                                        className="text-sm text-primary hover:underline"
                                    >
                                        View All Sessions &#8594;
                                    </Link>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog
                open={isDisableDialogOpen}
                onOpenChange={setIsDisableDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            Disabling 2FA reduces your account security. Are
                            you sure?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDisableDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={disableTwoFactor}
                        >
                            Disable 2FA
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
