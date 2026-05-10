import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { format, formatDistanceToNow } from 'date-fns';
import {
    ArrowRight,
    FileText,
    HardDrive,
    Lock,
    Monitor,
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    Users,
} from 'lucide-react';

type DashboardUser = PageProps['auth']['user'] & {
    avatar_url?: string | null;
    last_login_at?: string | null;
    last_login_ip?: string | null;
    two_factor_enabled?: boolean;
    two_factor_deadline?: string | null;
};

type DashboardStats = {
    document_count: number;
    shared_with_me: number;
    active_sessions: number;
    failed_logins_24h: number;
    storage_used: number;
    total_documents: number;
    average_file_size: number;
};

type RecentDocument = {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    created_at: string;
};

type RecentActivity = {
    action: string;
    metadata?: Record<string, unknown> | null;
    created_at: string;
    ip_address?: string | null;
};

interface DashboardProps extends PageProps {
    stats: DashboardStats;
    days_until_password_expiry: number | null;
    recent_documents: RecentDocument[];
    recent_activity: RecentActivity[];
}

function formatBytes(bytes: number) {
    if (bytes === 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const power = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1,
    );
    const value = bytes / 1024 ** power;

    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[power]}`;
}

function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
        return 'Good morning';
    }

    if (hour < 17) {
        return 'Good afternoon';
    }

    return 'Good evening';
}

function getGreetingName(name: string) {
    const trimmedName = name.trim();
    const firstName = trimmedName.split(/\s+/)[0] ?? trimmedName;

    return ['super', 'admin', 'system'].includes(firstName.toLowerCase())
        ? trimmedName
        : firstName;
}

function getActivityLabel(action: string) {
    switch (action) {
        case 'login':
        case 'login_success':
            return 'Login verified';
        case 'login_failed':
            return 'Login failure';
        case 'document_uploaded':
            return 'Upload verified';
        case 'document_downloaded':
            return 'Document downloaded';
        case 'document_shared':
            return 'Document shared';
        case 'document_deleted':
            return 'Moved to trash';
        case 'integrity_violation':
            return 'Integrity alert';
        case '2fa_enabled':
        case 'two_factor_enabled':
            return '2FA enabled';
        case '2fa_disabled':
        case 'two_factor_disabled':
            return '2FA disabled';
        case 'logout':
            return 'Session ended';
        default:
            return action
                .replaceAll('_', ' ')
                .replace(/\b\w/g, (character) => character.toUpperCase());
    }
}

function getActivityDescription(entry: RecentActivity) {
    const metadata = entry.metadata ?? {};
    const documentName =
        (typeof metadata.document_name === 'string' && metadata.document_name) ||
        (typeof metadata.original_name === 'string' && metadata.original_name);
    const documentLabel = documentName ? `"${documentName}"` : 'a document';

    switch (entry.action) {
        case 'login':
        case 'login_success':
            return 'Successful sign-in from a trusted session.';
        case 'login_failed':
            return 'A failed sign-in attempt was recorded.';
        case 'logout':
            return 'The current session was closed successfully.';
        case 'document_uploaded':
            return `${documentLabel} was encrypted and stored.`;
        case 'document_downloaded':
            return `${documentLabel} was downloaded from your vault.`;
        case 'document_shared':
            return `${documentLabel} was shared with another user.`;
        case 'document_deleted':
            return `${documentLabel} was moved to trash.`;
        case 'integrity_violation':
            return `${documentLabel} failed an integrity verification.`;
        case '2fa_enabled':
        case 'two_factor_enabled':
            return 'Two-factor authentication is now protecting this account.';
        case '2fa_disabled':
        case 'two_factor_disabled':
            return 'Two-factor authentication has been disabled.';
        default:
            return entry.action.replaceAll('_', ' ');
    }
}

function getActivityTone(action: string) {
    switch (action) {
        case 'login':
        case 'login_success':
        case 'document_uploaded':
        case 'document_downloaded':
        case '2fa_enabled':
        case 'two_factor_enabled':
            return {
                dot: 'bg-emerald-500',
                badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
            };
        case 'login_failed':
        case 'document_deleted':
        case 'integrity_violation':
        case '2fa_disabled':
        case 'two_factor_disabled':
            return {
                dot: 'bg-rose-500',
                badge: 'border-rose-200 bg-rose-50 text-rose-700',
            };
        default:
            return {
                dot: 'bg-amber-500',
                badge: 'border-amber-200 bg-amber-50 text-amber-700',
            };
    }
}

function getDocumentTone(mimeType: string) {
    if (mimeType.includes('pdf')) {
        return 'text-rose-600 bg-rose-50 border-rose-100';
    }

    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    }

    if (
        mimeType.includes('word') ||
        mimeType.includes('officedocument.word') ||
        mimeType.includes('msword')
    ) {
        return 'text-blue-700 bg-blue-50 border-blue-100';
    }

    return 'text-stone-700 bg-stone-50 border-stone-200';
}

export default function Dashboard({
    auth,
    stats,
    days_until_password_expiry,
    recent_documents,
    recent_activity,
}: DashboardProps) {
    const user = auth.user as DashboardUser;
    const roles = auth.roles ?? [];
    const permissions = auth.permissions ?? [];
    const canViewAdminDashboard = permissions.includes('view_admin_dashboard');
    const hasFailedLogins = stats.failed_logins_24h > 0;
    const hasTwoFactorEnabled = user.two_factor_enabled === true;
    const twoFactorDeadline = user.two_factor_deadline
        ? new Date(user.two_factor_deadline)
        : null;
    const firstName = getGreetingName(user.name);
    const workspaceEyebrow =
        roles.includes('super-admin') || roles.includes('admin')
          ? 'Personal Workspace'
          : 'Secure Document Workspace';

    const securityState = hasFailedLogins
        ? {
              label: 'Review Needed',
              badgeClassName:
                  'border-rose-200 bg-rose-50 text-rose-700',
              summaryClassName: 'text-rose-700',
          }
        : hasTwoFactorEnabled
          ? {
                label: 'Optimal',
                badgeClassName:
                    'border-emerald-200 bg-emerald-50 text-emerald-700',
                summaryClassName: 'text-emerald-700',
            }
          : {
                label: 'Protected',
                badgeClassName:
                    'border-amber-200 bg-amber-50 text-amber-700',
                summaryClassName: 'text-amber-700',
            };

    const statCards = [
        {
            label: 'Documents',
            value: stats.document_count,
            icon: FileText,
            detail: 'Encrypted files in your vault',
            href: route('documents.index'),
            iconClassName: 'bg-amber-50 text-amber-700',
        },
        {
            label: 'Shared',
            value: stats.shared_with_me,
            icon: Users,
            detail: 'Items shared with your account',
            href: route('shared.index'),
            iconClassName: 'bg-teal-50 text-teal-700',
        },
        {
            label: 'Sessions',
            value: stats.active_sessions,
            icon: Monitor,
            detail: 'Active sessions right now',
            href: route('sessions.index'),
            iconClassName: 'bg-emerald-50 text-emerald-700',
        },
        {
            label: 'Failed Logins',
            value: stats.failed_logins_24h,
            icon: ShieldAlert,
            detail: 'Recorded in the last 24 hours',
            href: route('activity.index'),
            iconClassName: hasFailedLogins
                ? 'bg-rose-50 text-rose-700'
                : 'bg-stone-100 text-stone-700',
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                        {workspaceEyebrow}
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                        Dashboard
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-stone-600">
                        Monitor vault health, recent document activity, and the
                        most important security signals from one place.
                    </p>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {days_until_password_expiry !== null &&
                        days_until_password_expiry <= 14 && (
                            <Alert className="border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-700">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>Password expiring soon</AlertTitle>
                                <AlertDescription>
                                    Your password will expire in{' '}
                                    {days_until_password_expiry} day
                                    {days_until_password_expiry === 1 ? '' : 's'}.{' '}
                                    <Link
                                        href={route('profile.edit')}
                                        className="font-medium underline underline-offset-4"
                                    >
                                        Update it now
                                    </Link>{' '}
                                    to avoid being locked out.
                                </AlertDescription>
                            </Alert>
                        )}

                    {!hasTwoFactorEnabled && twoFactorDeadline && (() => {
                        const hoursLeft = Math.max(
                            0,
                            Math.floor((twoFactorDeadline.getTime() - Date.now()) / 36e5),
                        );
                        const isUrgent = hoursLeft < 24;

                        return (
                            <Alert
                                className={cn(
                                    isUrgent
                                        ? 'border-rose-200 bg-rose-50 text-rose-800 [&>svg]:text-rose-700'
                                        : 'border-amber-200 bg-amber-50 text-amber-800 [&>svg]:text-amber-700',
                                )}
                            >
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>Two-factor authentication required</AlertTitle>
                                <AlertDescription>
                                    {hoursLeft > 0
                                        ? `You have ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} remaining to enable 2FA before restrictions apply.`
                                        : 'Your grace period has expired. Enable 2FA now to restore full access.'}{' '}
                                    <Link
                                        href={route('profile.edit')}
                                        className="font-medium underline underline-offset-4"
                                    >
                                        Set up 2FA now
                                    </Link>
                                    .
                                </AlertDescription>
                            </Alert>
                        );
                    })()}

                    <div className="space-y-6">
                        <div className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1.75fr)_minmax(340px,1fr)]">
                            <Card className="rounded-[28px] border-stone-200/80 bg-white shadow-sm">
                                <CardContent className="p-6 sm:p-7">
                                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                                                    Overview
                                                </p>
                                                <div className="space-y-3">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <h2 className="text-4xl font-semibold tracking-tight text-stone-950">
                                                            {getGreeting()}, {firstName}!
                                                        </h2>
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                'w-fit rounded-full px-3 py-1 text-sm font-semibold',
                                                                securityState.badgeClassName,
                                                            )}
                                                        >
                                                            {securityState.label}
                                                        </Badge>
                                                    </div>
                                                    <p className="max-w-3xl text-sm leading-6 text-stone-600">
                                                        Your vault security status is{' '}
                                                        <span
                                                            className={cn(
                                                                'font-medium',
                                                                securityState.summaryClassName,
                                                            )}
                                                        >
                                                            {securityState.label}
                                                        </span>
                                                        . Last login was{' '}
                                                        {user.last_login_at
                                                            ? formatDistanceToNow(
                                                                  new Date(user.last_login_at),
                                                                  { addSuffix: true },
                                                              )
                                                            : 'not recorded'}
                                                        .
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <Button
                                                variant="outline"
                                                asChild
                                                className="border-stone-200 bg-white text-stone-900 hover:bg-stone-50"
                                            >
                                                <Link href={route('activity.index')}>
                                                    View Audit Logs
                                                </Link>
                                            </Button>
                                            {canViewAdminDashboard && (
                                                <Button
                                                    asChild
                                                    className="bg-amber-700 text-white hover:bg-amber-800"
                                                >
                                                    <Link href={route('admin.dashboard')}>
                                                        Admin Dashboard
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-[28px] border-stone-200/80 bg-white shadow-sm">
                                <CardHeader className="border-b border-stone-200/80 pb-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <CardTitle className="text-2xl font-semibold text-stone-950">
                                            Recent Activity
                                        </CardTitle>
                                        <Link
                                            href={route('activity.index')}
                                            className="text-sm font-medium text-amber-700 hover:text-amber-800"
                                        >
                                            View All
                                        </Link>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-5 p-5 xl:max-h-[460px] xl:overflow-y-auto">
                                    {recent_activity.length === 0 ? (
                                        <p className="text-sm text-stone-500">
                                            No recent activity recorded.
                                        </p>
                                    ) : (
                                        recent_activity.map((entry, index) => {
                                            const tone = getActivityTone(entry.action);

                                            return (
                                                <div
                                                    key={`${entry.action}-${entry.created_at}-${index}`}
                                                    className="flex gap-4"
                                                >
                                                    <div className="flex flex-col items-center">
                                                        <span
                                                            className={cn(
                                                                'mt-1 h-3 w-3 rounded-full',
                                                                tone.dot,
                                                            )}
                                                        />
                                                        {index !==
                                                            recent_activity.length - 1 && (
                                                            <span className="mt-2 h-full w-px bg-stone-200" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1 space-y-2 pb-2">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                'w-fit rounded-full text-xs font-medium',
                                                                tone.badge,
                                                            )}
                                                        >
                                                            {getActivityLabel(entry.action)}
                                                        </Badge>
                                                        <p className="text-sm leading-6 text-stone-700">
                                                            {getActivityDescription(entry)}
                                                        </p>
                                                        <p className="text-xs font-medium text-stone-500">
                                                            {format(
                                                                new Date(entry.created_at),
                                                                "MMM d, yyyy 'at' p",
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {statCards.map((card) => {
                                const Icon = card.icon;

                                return (
                                    <Link key={card.label} href={card.href}>
                                        <Card className="h-full rounded-[24px] border-stone-200/80 bg-white shadow-sm transition-colors hover:border-amber-200">
                                            <CardContent className="space-y-5 p-5">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                                                            {card.label}
                                                        </p>
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            'flex h-10 w-10 items-center justify-center rounded-2xl',
                                                            card.iconClassName,
                                                        )}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-4xl font-semibold tracking-tight text-stone-950">
                                                        {card.value}
                                                    </p>
                                                    <p className="text-sm text-stone-500">
                                                        {card.detail}
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_320px]">
                            <Card className="rounded-[28px] border-stone-200/80 bg-white shadow-sm">
                                <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-stone-200/80 pb-5">
                                    <div>
                                        <CardTitle className="text-2xl font-semibold text-stone-950">
                                            Recent Documents
                                        </CardTitle>
                                        <CardDescription className="text-sm text-stone-600">
                                            Latest files added to your vault
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        asChild
                                        className="text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                                    >
                                        <Link href={route('documents.index')}>
                                            View All
                                            <ArrowRight className="ml-1 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {recent_documents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                                                <Lock className="h-6 w-6" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-medium text-stone-950">
                                                    Your vault is empty
                                                </p>
                                                <p className="text-sm text-stone-500">
                                                    Upload your first document to begin protecting it.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="px-6 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                        Name
                                                    </TableHead>
                                                    <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                        Size
                                                    </TableHead>
                                                    <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                        Uploaded
                                                    </TableHead>
                                                    <TableHead className="px-6 text-right text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                        Actions
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recent_documents.map((document) => (
                                                    <TableRow
                                                        key={document.id}
                                                        className="hover:bg-stone-50/80"
                                                    >
                                                        <TableCell className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className={cn(
                                                                        'flex h-11 w-11 items-center justify-center rounded-2xl border',
                                                                        getDocumentTone(
                                                                            document.mime_type,
                                                                        ),
                                                                    )}
                                                                >
                                                                    <FileText className="h-5 w-5" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <Link
                                                                        href={route(
                                                                            'documents.show',
                                                                            document.id,
                                                                        )}
                                                                        className="block truncate font-medium text-stone-950 hover:underline"
                                                                    >
                                                                        {document.original_name}
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-stone-600">
                                                            {formatBytes(
                                                                document.file_size,
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-stone-600">
                                                            {format(
                                                                new Date(
                                                                    document.created_at,
                                                                ),
                                                                'MMM d, yyyy p',
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                asChild
                                                                className="text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                                                            >
                                                                <Link
                                                                    href={route(
                                                                        'documents.show',
                                                                        document.id,
                                                                    )}
                                                                >
                                                                    Open
                                                                </Link>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-[28px] border-stone-200/80 bg-white shadow-sm">
                                <CardHeader className="border-b border-stone-200/80 pb-5">
                                    <CardTitle className="text-2xl font-semibold text-stone-950">
                                        Vault Storage
                                    </CardTitle>
                                    <CardDescription className="text-sm text-stone-600">
                                        Current storage utilization
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 p-5">
                                    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Encrypted Storage Used
                                        </p>
                                        <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
                                            {formatBytes(stats.storage_used)}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Total Documents
                                        </p>
                                        <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
                                            {stats.total_documents}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Average File Size
                                        </p>
                                        <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
                                            {formatBytes(stats.average_file_size)}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <Card className="rounded-[28px] border-stone-200/80 bg-white shadow-sm">
                                <CardHeader className="border-b border-stone-200/80 pb-5">
                                    <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-stone-950">
                                        <ShieldCheck className="h-5 w-5 text-emerald-700" />
                                        Security Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5 p-5">
                                    <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-4">
                                        <span className="text-sm text-stone-700">
                                            Encrypted Connection
                                        </span>
                                        <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                            Active
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 border-b border-stone-100 pb-4">
                                        <span className="text-sm text-stone-700">
                                            2FA Status
                                        </span>
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-2 text-sm font-medium',
                                                hasTwoFactorEnabled
                                                    ? 'text-emerald-700'
                                                    : 'text-amber-700',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'h-2.5 w-2.5 rounded-full',
                                                    hasTwoFactorEnabled
                                                        ? 'bg-emerald-500'
                                                        : 'bg-amber-500',
                                                )}
                                            />
                                            {hasTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm text-stone-700">
                                            Last Login IP
                                        </span>
                                        <span className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1 font-mono text-xs text-stone-700">
                                            {user.last_login_ip || 'Unavailable'}
                                        </span>
                                    </div>

                                    {!hasTwoFactorEnabled && (
                                        <Button
                                            variant="ghost"
                                            asChild
                                            className="h-auto justify-start px-0 text-amber-700 hover:bg-transparent hover:text-amber-800"
                                        >
                                            <Link href={route('profile.edit')}>
                                                Enable 2FA
                                                <ArrowRight className="ml-1 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="rounded-[28px] border-stone-200/80 bg-white shadow-sm">
                                <CardHeader className="border-b border-stone-200/80 pb-5">
                                    <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-stone-950">
                                        <HardDrive className="h-5 w-5 text-amber-700" />
                                        Vault Snapshot
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Recent Document Count
                                        </p>
                                        <p className="mt-2 text-2xl font-semibold text-stone-950">
                                            {recent_documents.length}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Failed Logins Today
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            {hasFailedLogins ? (
                                                <ShieldX className="h-5 w-5 text-rose-700" />
                                            ) : (
                                                <ShieldCheck className="h-5 w-5 text-emerald-700" />
                                            )}
                                            <p className="text-2xl font-semibold text-stone-950">
                                                {stats.failed_logins_24h}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
