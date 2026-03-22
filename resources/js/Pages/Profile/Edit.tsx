import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    ChevronRight,
    KeyRound,
    Monitor,
    Shield,
    ShieldAlert,
    ShieldCheck,
    User,
} from 'lucide-react';
import { FormEvent, useMemo } from 'react';
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
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={route('dashboard')}>Main</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Profile</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Profile Security" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            <Card>
                                <CardHeader className="flex flex-row items-center gap-2 border-b border-border pb-4">
                                    <User className="h-4 w-4 text-primary" />
                                    <CardTitle className="font-semibold text-foreground">
                                        Profile Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-5">
                                    <form onSubmit={submitProfile} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={profileForm.data.name}
                                                onChange={(event) => profileForm.setData('name', event.target.value)}
                                                autoComplete="name"
                                            />
                                            {profileForm.errors.name && (
                                                <p className="text-sm text-destructive">{profileForm.errors.name}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={profileForm.data.email}
                                                onChange={(event) => profileForm.setData('email', event.target.value)}
                                                autoComplete="email"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Changing your email will require re-verification.
                                            </p>
                                            {profileForm.errors.email && (
                                                <p className="text-sm text-destructive">{profileForm.errors.email}</p>
                                            )}
                                        </div>

                                        <div className="flex justify-end">
                                            <Button
                                                type="submit"
                                                disabled={profileForm.processing}
                                                className="bg-primary text-primary-foreground"
                                            >
                                                Update Profile
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>

                            <Separator className="my-2" />

                            <Card>
                                <CardHeader className="flex flex-row items-center gap-2 border-b border-border pb-4">
                                    <KeyRound className="h-4 w-4 text-primary" />
                                    <CardTitle className="font-semibold text-foreground">
                                        Update Password
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-5">
                                    <form onSubmit={submitPassword} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="current_password">Current Password</Label>
                                            <Input
                                                id="current_password"
                                                type="password"
                                                value={passwordForm.data.current_password}
                                                onChange={(event) => passwordForm.setData('current_password', event.target.value)}
                                                autoComplete="current-password"
                                            />
                                            {passwordForm.errors.current_password && (
                                                <p className="text-sm text-destructive">
                                                    {passwordForm.errors.current_password}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="password">New Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={passwordForm.data.password}
                                                onChange={(event) => passwordForm.setData('password', event.target.value)}
                                                autoComplete="new-password"
                                            />
                                            {passwordForm.data.password && (
                                                <div className="space-y-1">
                                                    <Progress
                                                        value={
                                                            passwordStrength.label === 'Strong'
                                                                ? 100
                                                                : passwordStrength.label === 'Fair'
                                                                  ? 50
                                                                  : 25
                                                        }
                                                        className={`h-1 ${
                                                            passwordStrength.label === 'Weak'
                                                                ? '[&>div]:bg-destructive'
                                                                : passwordStrength.label === 'Fair'
                                                                  ? '[&>div]:bg-amber-500'
                                                                  : '[&>div]:bg-green-500'
                                                        }`}
                                                    />
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-xs text-muted-foreground">
                                                            Min. 8 chars · Uppercase · Lowercase · Number · Special character
                                                        </p>
                                                        <span
                                                            className={`text-xs font-medium ${
                                                                passwordStrength.label === 'Weak'
                                                                    ? 'text-destructive'
                                                                    : passwordStrength.label === 'Fair'
                                                                      ? 'text-amber-500'
                                                                      : 'text-green-500'
                                                            }`}
                                                        >
                                                            {passwordStrength.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            {passwordFieldError && (
                                                <div
                                                    className={`rounded-lg p-3 ${
                                                        passwordFieldError.includes('data breach')
                                                            ? 'border border-destructive/20 bg-destructive/10'
                                                            : ''
                                                    }`}
                                                >
                                                    {passwordFieldError.includes('data breach') && (
                                                        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-destructive">
                                                            <ShieldAlert className="h-4 w-4" />
                                                            Security Alert
                                                        </div>
                                                    )}
                                                    <p className="text-sm font-medium text-destructive">{passwordFieldError}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                            <Input
                                                id="password_confirmation"
                                                type="password"
                                                value={passwordForm.data.password_confirmation}
                                                onChange={(event) =>
                                                    passwordForm.setData('password_confirmation', event.target.value)
                                                }
                                                autoComplete="new-password"
                                            />
                                            {passwordConfirmationError && (
                                                <p className="text-sm text-destructive">{passwordConfirmationError}</p>
                                            )}
                                        </div>

                                        <div className="flex justify-end">
                                            <Button
                                                type="submit"
                                                disabled={passwordForm.processing}
                                                className="bg-primary text-primary-foreground"
                                            >
                                                Update Password
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6 lg:col-span-1">
                            {!two_factor_enabled ? (
                                <Card className="border-amber-500/30 bg-amber-500/10">
                                    <CardContent className="space-y-4 pt-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <Badge
                                                    variant="outline"
                                                    className="mb-2 border-amber-500/30 bg-amber-500/20 text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400"
                                                >
                                                    Action Recommended
                                                </Badge>
                                                <CardTitle className="text-lg text-foreground">
                                                    Two-Factor Authentication
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    Add an extra layer of security. 2FA is currently disabled.
                                                </p>
                                            </div>
                                            <ShieldAlert className="h-10 w-10 flex-shrink-0 text-amber-500" />
                                        </div>
                                        <Button asChild className="w-full gap-2 bg-primary text-primary-foreground">
                                            <Link href="/two-factor/setup">
                                                <Shield className="h-4 w-4" />
                                                Enable 2FA
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="border-green-500/20 bg-green-500/5">
                                    <CardContent className="space-y-4 pt-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <Badge
                                                    variant="outline"
                                                    className="mb-2 border-green-500/30 bg-green-500/20 text-xs uppercase tracking-wide text-green-700 dark:text-green-400"
                                                >
                                                    Protected
                                                </Badge>
                                                <CardTitle className="text-lg text-foreground">
                                                    Two-Factor Authentication
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    Your account is protected with TOTP-based 2FA.
                                                </p>
                                            </div>
                                            <ShieldCheck className="h-10 w-10 flex-shrink-0 text-green-500" />
                                        </div>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                                                >
                                                    Disable 2FA
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Disable 2FA?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Disabling two-factor authentication reduces your account security. Are you sure?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        onClick={disableTwoFactor}
                                                    >
                                                        Disable 2FA
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                                    <CardTitle className="text-sm font-semibold text-foreground">
                                        Active Sessions
                                    </CardTitle>
                                    <Badge className="rounded-full bg-primary/15 text-xs text-primary">
                                        {session_count}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <ScrollArea className="max-h-48">
                                        <div className="space-y-3">
                                            {recent_sessions.length > 0 ? (
                                                recent_sessions.map((session) => (
                                                    <div key={session.id} className="flex items-center gap-3">
                                                        <div className="flex-shrink-0 rounded bg-muted p-1.5">
                                                            <Monitor className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-foreground">
                                                                    Web Session
                                                                </span>
                                                                {session.is_current && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="border-primary/20 bg-primary/15 text-xs text-primary"
                                                                    >
                                                                        Current
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="truncate font-mono text-xs text-muted-foreground">
                                                                {session.ip_address ?? '—'}
                                                            </p>
                                                        </div>
                                                        <span className="flex-shrink-0 text-xs text-muted-foreground">
                                                            {formatSessionActivity(session.last_activity)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    No active sessions found.
                                                </p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <Separator className="mb-3 mt-4" />
                                    <Link
                                        href="/sessions"
                                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                                    >
                                        View All Sessions
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
