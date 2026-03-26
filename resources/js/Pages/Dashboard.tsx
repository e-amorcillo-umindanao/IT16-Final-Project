import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeBasedGreeting } from '@/components/TimeBasedGreeting';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
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
    avatar_url?: string | null;
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
    const firstName = user.name.split(/\s+/)[0] ?? user.name;

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
    const vaultStatus = status.label;

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

    const getGreeting = (): string => {
        const hour = new Date().getHours();

        if (hour < 12) {
            return 'Good morning';
        }

        if (hour < 17) {
            return 'Good afternoon';
        }

        return 'Good evening';
    };

    const getGreetingEmoji = (): string => {
        const hour = new Date().getHours();

        if (hour < 12) {
            return '☀️';
        }

        if (hour < 17) {
            return '🌤️';
        }

        return '🌙';
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
            case 'signed_url_generated':
                return 'Share Link';
            case 'signed_url_accessed':
                return 'Link Accessed';
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
            (typeof metadata.document_name === 'string' && metadata.document_name) ||
            (typeof metadata.original_name === 'string' && metadata.original_name);
        const documentLabel = documentName ? `"${documentName}"` : 'a document';
        const location = metadata.location as { city?: string; country?: string } | undefined;

        switch (entry.action) {
            case 'login':
            case 'login_success':
                return location?.city
                    ? `Signed in from ${[location.city, location.country].filter(Boolean).join(', ')}`
                    : 'Signed in successfully';
            case 'login_failed':
                return 'Failed login attempt';
            case 'logout':
                return typeof metadata.ip_address === 'string'
                    ? `Signed out from ${metadata.ip_address}`
                    : entry.ip_address
                      ? `Signed out from ${entry.ip_address}`
                      : 'Signed out';
            case 'document_uploaded':
                return `Uploaded ${documentLabel}`;
            case 'document_downloaded':
                return `Downloaded ${documentLabel}`;
            case 'document_shared':
                return typeof metadata.shared_with === 'string'
                    ? `Shared ${documentLabel} with ${metadata.shared_with}`
                    : `Shared ${documentLabel}`;
            case 'document_deleted':
                return `Moved ${documentLabel} to trash`;
            case 'document_restored':
                return `Restored ${documentLabel}`;
            case 'document_starred':
                return `Starred ${documentLabel}`;
            case 'document_unstarred':
                return `Unstarred ${documentLabel}`;
            case 'signed_url_generated':
                return typeof metadata.expires_hours === 'number'
                    ? `Generated share link for ${documentLabel} (${metadata.expires_hours}h)`
                    : `Generated share link for ${documentLabel}`;
            case 'signed_url_accessed':
                return `Share link accessed for ${documentLabel}`;
            case 'share_revoked':
                return typeof metadata.revoked_from === 'string'
                    ? `Revoked access to ${documentLabel} from ${metadata.revoked_from}`
                    : `Revoked access to ${documentLabel}`;
            case '2fa_enabled':
            case 'two_factor_enabled':
                return 'Two-factor authentication enabled';
            case '2fa_disabled':
            case 'two_factor_disabled':
                return 'Two-factor authentication disabled';
            case 'password_changed':
                return 'Password updated';
            case 'profile_updated':
                return 'Profile information updated';
            case 'account_locked':
                return 'Account locked after failed attempts';
            case 'session_revoked':
            case 'session_terminated':
                return 'Active session revoked';
            case 'integrity_violation':
                return `Integrity check failed for ${documentLabel}`;
            case 'bulk_download':
                return typeof metadata.document_count === 'number'
                    ? `Downloaded ${metadata.document_count} documents as ZIP`
                    : 'Bulk download performed';
            case 'bulk_delete':
                return typeof metadata.document_count === 'number'
                    ? `Moved ${metadata.document_count} documents to trash`
                    : 'Bulk delete performed';
            default:
                return entry.action.replace(/_/g, ' ');
        }
    };

    const getActivityBadgeClassName = (action: string) => {
        switch (action) {
            case 'document_uploaded':
            case 'document_downloaded':
            case '2fa_enabled':
            case 'login':
                return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30';
            case 'login_failed':
            case 'document_deleted':
            case 'integrity_violation':
            case 'account_locked':
            case '2fa_failed':
                return 'bg-destructive/15 text-destructive border-destructive/30';
            default:
                return 'bg-primary/15 text-primary border-primary/30';
        }
    };

    const avatarColors = [
        'bg-amber-600',
        'bg-blue-600',
        'bg-emerald-600',
        'bg-violet-600',
        'bg-orange-600',
        'bg-teal-600',
    ];

    const getAvatarColor = (name: string) =>
        avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

    const getInitials = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        const first = parts[0]?.[0] ?? '';
        const last =
            parts.length > 1
                ? parts[parts.length - 1]?.[0] ?? ''
                : parts[0]?.[1] ?? '';

        return `${first}${last}`.toUpperCase();
    };

    const statCards = [
        {
            label: 'Documents',
            value: stats.document_count,
            icon: FileText,
            valueClassName: 'text-foreground',
            description: 'Encrypted files in vault',
            tooltip: 'Total encrypted documents in your vault',
            href: '/documents',
            cardClassName: 'cursor-pointer min-h-[130px] hover:border-primary/50',
        },
        {
            label: 'Shared',
            value: stats.shared_with_me,
            icon: Users,
            valueClassName: 'text-foreground',
            description: 'Shared with you',
            tooltip: 'Documents that other users shared with your account',
            href: '/shared',
            cardClassName: 'cursor-pointer min-h-[130px] hover:border-primary/50',
        },
        {
            label: 'Sessions',
            value: stats.active_sessions,
            icon: Monitor,
            valueClassName: 'text-foreground',
            description: 'Active logins',
            tooltip: 'Current active sessions for your SecureVault account',
            href: '/sessions',
            cardClassName: 'cursor-pointer min-h-[130px] hover:border-primary/50',
        },
        {
            label: 'Failed Logins',
            value: stats.failed_logins_24h,
            icon: ShieldAlert,
            valueClassName: hasFailedLogins ? 'text-destructive' : 'text-foreground',
            description: 'Security attempts today',
            tooltip: 'Failed login attempts recorded in the last 24 hours',
            href: '/activity',
            cardClassName: hasFailedLogins
                ? 'cursor-pointer min-h-[130px] border-amber-500/30 bg-amber-500/5'
                : 'cursor-pointer min-h-[130px] hover:border-primary/50',
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                        <div className="space-y-6 md:col-span-8">
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink asChild>
                                            <Link href="/dashboard">Main</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>Dashboard</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>

                            <Card className="overflow-hidden">
                                <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
                                                Overview
                                            </p>
                                            <div className="space-y-1">
                                                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
                                                <TimeBasedGreeting firstName={firstName} />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', status.className)}>
                                                {status.label}
                                            </span>
                                            <p className="text-sm text-muted-foreground">
                                                Your vault security status is{' '}
                                                <span
                                                    className={cn(
                                                        'font-medium',
                                                        vaultStatus === 'Optimal'
                                                            ? 'text-green-700 dark:text-green-400'
                                                            : vaultStatus === 'Review Needed'
                                                              ? 'text-amber-700 dark:text-amber-400'
                                                              : 'text-destructive'
                                                    )}
                                                >
                                                    {vaultStatus}
                                                </span>
                                                . Last login was {formatRelativeTime(user.last_login_at)}.
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

                            <TooltipProvider>
                                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                                    {statCards.map(({ label, value, icon: Icon, valueClassName, description, tooltip, href, cardClassName }) => (
                                        <Link key={label} href={href}>
                                            <Card className={cn('transition-colors', cardClassName)}>
                                                <CardHeader className="pb-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <CardTitle className="text-xs font-semibold uppercase tracking-wider leading-tight text-muted-foreground">
                                                            {label}
                                                        </CardTitle>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <div className="cursor-help rounded-lg border border-border bg-muted p-2 flex-shrink-0">
                                                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                                                </div>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{tooltip}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pb-4">
                                                    <div className={cn('text-3xl font-bold text-foreground', valueClassName)}>{value}</div>
                                                    <p className="mt-1 text-xs text-muted-foreground">{description}</p>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            </TooltipProvider>

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
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="px-6">File</TableHead>
                                                    <TableHead>Size</TableHead>
                                                    <TableHead>Uploaded</TableHead>
                                                    <TableHead className="px-6 text-right"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recent_documents.map((document) => (
                                                    <TableRow key={document.id} className="hover:bg-muted/50">
                                                        <TableCell className="px-6">
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                                                    {getFileIcon(document.mime_type)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <Link
                                                                        href={route('documents.show', document.id)}
                                                                        className="block truncate font-medium text-foreground hover:underline"
                                                                    >
                                                                        {document.original_name}
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {formatBytes(document.file_size)}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                                                        </TableCell>
                                                        <TableCell className="px-6 text-right">
                                                            <Button variant="ghost" size="sm" asChild>
                                                                <Link href={route('documents.show', document.id)}>
                                                                    Open
                                                                    <ArrowRight className="ml-2 h-4 w-4" />
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
                        </div>

                        <div className="space-y-6 md:col-span-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                                    <CardTitle className="text-sm font-semibold text-foreground">
                                        Recent Activity
                                    </CardTitle>
                                    <Link href="/activity" className="text-xs text-primary hover:underline">
                                        View All
                                    </Link>
                                </CardHeader>
                                <CardContent className="space-y-3 pt-4">
                                    {recent_activity.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
                                    ) : (
                                        recent_activity.map((entry, index) => (
                                            <div
                                                key={`${entry.action}-${entry.created_at}-${index}`}
                                                className="flex items-start gap-3"
                                            >
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.name} />
                                                    <AvatarFallback className={cn('text-xs font-semibold text-white', getAvatarColor(user.name))}>
                                                        {getInitials(user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant="outline"
                                                            className={getActivityBadgeClassName(entry.action)}
                                                        >
                                                            {getActivityLabel(entry.action)}
                                                        </Badge>
                                                        <span className={cn('h-2 w-2 shrink-0 rounded-full', getActivitySeverity(entry.action))} />
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
                                        <Badge
                                            variant="outline"
                                            className="border-green-500/30 bg-green-500/15 text-xs text-green-700 dark:text-green-400"
                                        >
                                            Active
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <span className={cn('h-2.5 w-2.5 rounded-full', hasTwoFactorEnabled ? 'bg-status-success' : 'bg-primary')} />
                                            <span className="text-sm text-foreground">2FA</span>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                'text-xs',
                                                hasTwoFactorEnabled
                                                    ? 'border-green-500/30 bg-green-500/15 text-green-700 dark:text-green-400'
                                                    : 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                            )}
                                        >
                                            {hasTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                                        </Badge>
                                    </div>

                                    {!hasTwoFactorEnabled && (
                                        <Button variant="ghost" asChild className="h-auto justify-start px-0 text-primary hover:bg-transparent hover:text-primary/80">
                                            <Link href={route('profile.edit')}>
                                                Enable 2FA
                                                <ArrowRight className="ml-1 h-4 w-4" />
                                            </Link>
                                        </Button>
                                    )}

                                    <Separator className="my-4" />

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
