import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    ArrowRight,
    FileText,
    HardDrive,
    Lock,
    Monitor,
    ShieldAlert,
    ShieldCheck,
    Upload,
    Users,
} from 'lucide-react';

type DashboardUser = PageProps['auth']['user'] & {
    last_login_at?: string | null;
    last_login_ip?: string | null;
    two_factor_enabled?: boolean;
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
    recent_documents: RecentDocument[];
    recent_activity: RecentActivity[];
}

export default function Dashboard({
    auth,
    stats,
    recent_documents,
    recent_activity,
}: DashboardProps) {
    const user = auth.user as DashboardUser;
    const permissions = auth.permissions ?? [];
    const canViewAdminDashboard = permissions.includes('view_admin_dashboard');
    const hasFailedLogins = stats.failed_logins_24h > 0;
    const hasTwoFactorEnabled = user.two_factor_enabled === true;

    const status = hasFailedLogins
        ? {
              label: 'At Risk',
              className: 'border border-destructive/20 bg-destructive/10 text-destructive',
          }
        : hasTwoFactorEnabled
          ? {
                label: 'Optimal',
                className: 'border border-status-success/20 bg-status-success/10 text-status-success',
            }
          : {
                label: 'Review Needed',
                className: 'border border-primary/20 bg-primary/10 text-primary',
            };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) {
            return '0 B';
        }

        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / 1024 ** power;

        return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[power]}`;
    };

    const formatRelativeTime = (value?: string | null) => {
        if (!value) {
            return 'No recent login recorded';
        }

        return formatDistanceToNow(new Date(value), { addSuffix: true });
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) {
            return <FileText className="h-4 w-4 text-destructive" />;
        }

        if (mimeType.includes('sheet') || mimeType.includes('excel')) {
            return <FileText className="h-4 w-4 text-status-success" />;
        }

        if (mimeType.includes('word') || mimeType.includes('officedocument.word') || mimeType.includes('msword')) {
            return <FileText className="h-4 w-4 text-primary" />;
        }

        return <FileText className="h-4 w-4 text-muted-foreground" />;
    };

    const getActivitySeverity = (action: string) => {
        switch (action) {
            case 'document_uploaded':
            case 'document_downloaded':
            case '2fa_enabled':
            case 'login':
                return 'bg-status-success';
            case 'document_shared':
            case 'password_changed':
            case 'profile_updated':
            case 'logout':
            case 'session_revoked':
            case '2fa_disabled':
                return 'bg-primary';
            case 'login_failed':
            case 'document_deleted':
            case 'integrity_violation':
            case 'account_locked':
            case '2fa_failed':
                return 'bg-destructive';
            default:
                return 'bg-primary';
        }
    };

    const getActivityLabel = (action: string) => {
        switch (action) {
            case 'login':
                return 'Login';
            case 'logout':
                return 'Logout';
            case 'document_uploaded':
                return 'Upload';
            case 'document_downloaded':
                return 'Download';
            case 'document_shared':
                return 'Shared';
            case 'share_revoked':
                return 'Share Revoked';
            case 'document_deleted':
                return 'Deleted';
            case 'document_restored':
                return 'Restored';
            case 'integrity_violation':
                return 'Integrity Alert';
            case 'login_failed':
                return 'Failed Login';
            case '2fa_enabled':
                return '2FA Enabled';
            case '2fa_disabled':
                return '2FA Disabled';
            case '2fa_failed':
                return '2FA Failed';
            case 'session_revoked':
                return 'Session Revoked';
            default:
                return action.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
        }
    };

    const getActivityDescription = (entry: RecentActivity) => {
        const metadata = entry.metadata ?? {};
        const documentName =
            (typeof metadata.original_name === 'string' && metadata.original_name) ||
            (typeof metadata.document_name === 'string' && metadata.document_name);

        switch (entry.action) {
            case 'document_uploaded':
            case 'document_downloaded':
            case 'document_deleted':
            case 'document_restored':
                return documentName || 'Vault document';
            case 'document_shared':
                return typeof metadata.shared_with === 'string'
                    ? `Shared with ${metadata.shared_with}`
                    : 'Access granted to a collaborator';
            case 'share_revoked':
                return typeof metadata.revoked_from === 'string'
                    ? `Revoked from ${metadata.revoked_from}`
                    : 'Access was revoked';
            case 'login_failed':
                return typeof metadata.email === 'string' ? metadata.email : 'A login attempt failed';
            case 'integrity_violation':
                return typeof metadata.reason === 'string' ? metadata.reason : 'File integrity check failed';
            case 'logout':
                return entry.ip_address ? `Signed out from ${entry.ip_address}` : 'Signed out of SecureVault';
            case '2fa_enabled':
                return 'Two-factor authentication was enabled';
            case '2fa_disabled':
                return 'Two-factor authentication was disabled';
            case '2fa_failed':
                return 'Incorrect verification code submitted';
            case 'session_revoked':
                return typeof metadata.ip_address === 'string'
                    ? `Session ended for ${metadata.ip_address}`
                    : 'A session was revoked';
            default:
                return 'Account activity recorded';
        }
    };

    const statCards = [
        {
            label: 'My Documents',
            value: stats.document_count,
            icon: FileText,
            valueClassName: 'text-foreground',
        },
        {
            label: 'Shared with Me',
            value: stats.shared_with_me,
            icon: Users,
            valueClassName: 'text-foreground',
        },
        {
            label: 'Active Sessions',
            value: stats.active_sessions,
            icon: Monitor,
            valueClassName: 'text-foreground',
        },
        {
            label: 'Failed Logins (24h)',
            value: stats.failed_logins_24h,
            icon: ShieldAlert,
            valueClassName: hasFailedLogins ? 'text-destructive' : 'text-foreground',
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                        <div className="space-y-6 md:col-span-8">
                            <Card className="overflow-hidden">
                                <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
                                                Overview
                                            </p>
                                            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                                                Welcome back, {user.name}
                                            </h1>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', status.className)}>
                                                {status.label}
                                            </span>
                                            <p className="text-sm text-muted-foreground">
                                                Your vault security status is {status.label.toLowerCase()}. Last login was {formatRelativeTime(user.last_login_at)}.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <Button variant="outline" asChild>
                                            <Link href={route('activity.index')}>View Audit Logs</Link>
                                        </Button>
                                        {canViewAdminDashboard && (
                                            <Button asChild>
                                                <Link href={route('admin.dashboard')}>Admin Dashboard</Link>
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                                {statCards.map(({ label, value, icon: Icon, valueClassName }) => (
                                    <Card key={label}>
                                        <CardContent className="space-y-4 p-5">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground">{label}</p>
                                                <p className={cn('text-3xl font-semibold tracking-tight', valueClassName)}>{value}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <HardDrive className="h-5 w-5 text-primary" />
                                        Vault Storage
                                    </CardTitle>
                                    <CardDescription>Measured storage and document averages for your encrypted vault.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4 border-t border-border pt-6 sm:grid-cols-3">
                                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                                        <p className="text-sm text-muted-foreground">Encrypted Storage Used</p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">{formatBytes(stats.storage_used)}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                                        <p className="text-sm text-muted-foreground">Total Documents</p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">{stats.total_documents}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-muted/40 p-4">
                                        <p className="text-sm text-muted-foreground">Average File Size</p>
                                        <p className="mt-2 text-2xl font-semibold text-foreground">{formatBytes(stats.average_file_size)}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>Recent Documents</CardTitle>
                                        <CardDescription>Your five latest uploads in SecureVault.</CardDescription>
                                    </div>
                                    <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                                        <Link href={route('documents.index')}>
                                            View All
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardHeader>
                                <CardContent className="border-t border-border p-0">
                                    {recent_documents.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                <Lock className="h-5 w-5" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-medium text-foreground">Your vault is empty.</p>
                                                <p className="text-sm text-muted-foreground">Upload your first document.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-border">
                                            {recent_documents.map((document) => (
                                                <Link
                                                    key={document.id}
                                                    href={route('documents.show', document.id)}
                                                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                                            {getFileIcon(document.mime_type)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="truncate font-medium text-foreground">{document.original_name}</p>
                                                            <p className="text-sm text-muted-foreground">{formatBytes(document.file_size)}</p>
                                                        </div>
                                                    </div>
                                                    <p className="shrink-0 text-sm text-muted-foreground">
                                                        {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                                                    </p>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6 md:col-span-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between gap-4">
                                    <div>
                                        <CardTitle>Recent Activity</CardTitle>
                                        <CardDescription>Your latest eight audit events.</CardDescription>
                                    </div>
                                    <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
                                        <Link href={route('activity.index')}>
                                            View All
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4 border-t border-border pt-6">
                                    {recent_activity.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
                                    ) : (
                                        recent_activity.map((entry, index) => (
                                            <div
                                                key={`${entry.action}-${entry.created_at}-${index}`}
                                                className="flex items-start gap-3"
                                            >
                                                <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', getActivitySeverity(entry.action))} />
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-medium text-foreground">{getActivityLabel(entry.action)}</p>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{getActivityDescription(entry)}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
                                        Vault Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 border-t border-border pt-6">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className="h-2.5 w-2.5 rounded-full bg-status-success" />
                                            <span className="text-sm text-foreground">Encrypted Connection</span>
                                        </div>
                                        <span className="text-sm font-medium text-status-success">Active</span>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className={cn('h-2.5 w-2.5 rounded-full', hasTwoFactorEnabled ? 'bg-status-success' : 'bg-primary')} />
                                            <span className="text-sm text-foreground">2FA</span>
                                        </div>
                                        <span className={cn('text-sm font-medium', hasTwoFactorEnabled ? 'text-status-success' : 'text-primary')}>
                                            {hasTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>

                                    {!hasTwoFactorEnabled && (
                                        <Button variant="ghost" asChild className="h-auto justify-start px-0 text-primary hover:bg-transparent hover:text-primary/80">
                                            <Link href={route('profile.edit')}>
                                                Enable 2FA
                                                <ArrowRight className="ml-1 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    )}

                                    <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-4">
                                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last Login IP</p>
                                        <p className="font-mono text-sm text-foreground">{user.last_login_ip || 'Unavailable'}</p>
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
