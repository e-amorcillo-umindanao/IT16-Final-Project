import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoginChart } from '@/components/LoginChart';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import UserAvatar from '@/components/UserAvatar';
import { getAuditActionBadge } from '@/lib/auditActionBadge';
import { failedLoginColor } from '@/lib/failedLoginBadge';
import { formatBytes } from '@/lib/formatBytes';
import { pendingVerificationColor } from '@/lib/pendingVerificationColor';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    Clock3,
    Database,
    FileText,
    ShieldCheck,
    UserCheck,
    Users,
} from 'lucide-react';
import { ReactNode } from 'react';

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

interface Stats {
    total_users: number;
    active_users: number;
    active_sessions: number;
    total_documents: number;
    vault_storage: number;
    failed_logins_24h: number;
    pending_verifications: number;
}

interface ActivityItem {
    action: string;
    category: 'security' | 'audit';
    ip_address: string | null;
    created_at: string;
    user: {
        name: string;
        email: string;
        avatar_url: string | null;
    } | null;
}

interface Props {
    failed_login_warn: number;
    failed_login_danger: number;
    storage_limit: number;
    stats: Stats;
    recent_activity: ActivityItem[];
    login_chart: Array<{
        date: string;
        logins: number;
    }>;
}

function AdminStatCard({
    href,
    label,
    value,
    meta,
    icon,
    iconTone = 'bg-[#fdf0ea] text-[#b24b23]',
    valueClassName,
    footer,
}: {
    href?: string;
    label: string;
    value: ReactNode;
    meta: ReactNode;
    icon: ReactNode;
    iconTone?: string;
    valueClassName?: string;
    footer?: ReactNode;
}) {
    const content = (
        <Card className="h-full rounded-[28px] border border-[#ebd4c8] bg-white/95 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
            <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-stone-700">{label}</p>
                    </div>
                    <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', iconTone)}>
                        {icon}
                    </div>
                </div>
                <div className={cn('text-[2rem] font-semibold leading-none text-stone-950', valueClassName)}>
                    {value}
                </div>
                <div className="space-y-3">
                    <p className="text-sm text-stone-500">{meta}</p>
                    {footer}
                </div>
            </CardContent>
        </Card>
    );

    if (!href) {
        return content;
    }

    return (
        <Link href={href} className="block h-full">
            {content}
        </Link>
    );
}

export default function AdminDashboard({
    auth,
    failed_login_warn,
    failed_login_danger,
    storage_limit,
    stats,
    recent_activity,
    login_chart,
}: Props & PageProps) {
    const firstName = getGreetingName(auth.user.name);
    const permissions = new Set(auth.permissions ?? []);
    const canManageUsers = permissions.has('manage_users');
    const canViewDocuments = permissions.has('view_all_documents');
    const canViewAuditLogs = permissions.has('view_audit_logs');
    const canManageSessions = permissions.has('manage_sessions');

    const failedLoginClass = failedLoginColor(
        stats.failed_logins_24h,
        failed_login_warn,
        failed_login_danger,
    );
    const pendingVerificationClass = pendingVerificationColor(stats.pending_verifications);
    const storageUsedPct = storage_limit > 0
        ? Math.min((stats.vault_storage / storage_limit) * 100, 100)
        : 0;
    const storageBarClass = storageUsedPct >= 90
        ? 'bg-destructive'
        : storageUsedPct >= 75
          ? 'bg-amber-500'
          : 'bg-[#b24b23]';

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                        Admin Workspace
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                            Admin Dashboard
                        </h1>
                        <p className="text-sm text-stone-500">
                            Monitor system usage, review security events, and keep the
                            document platform running smoothly.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Admin Dashboard" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-[30px] border border-[#ecd8ce] bg-[#fdf8f4] p-6 shadow-sm">
                        <div className="space-y-5">
                            <div className="space-y-3">
                                <Badge className="rounded-full border-transparent bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-700 hover:bg-amber-500/15 dark:text-amber-400">
                                    Admin overview
                                </Badge>
                                <div className="space-y-3">
                                    <p className="text-sm text-stone-500">
                                        {getGreeting()}, {firstName}.
                                    </p>
                                    <h2 className="text-4xl font-semibold tracking-tight text-stone-950">
                                        Keep the vault healthy and accountable
                                    </h2>
                                    <p className="max-w-3xl text-sm leading-7 text-stone-500">
                                        This dashboard focuses on user health, session activity,
                                        document volume, and high-signal security events across the
                                        whole system.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                {canViewAuditLogs && (
                                    <Button
                                        variant="outline"
                                        className="h-11 rounded-2xl border-[#d7c3b7] bg-white px-4 text-stone-700"
                                        asChild
                                    >
                                        <Link href={route('admin.audit-logs', { category: 'security' })}>
                                            View Audit Logs
                                        </Link>
                                    </Button>
                                )}
                                {canManageUsers && (
                                    <Button
                                        className="h-11 rounded-2xl bg-[#b24b23] px-4 text-white hover:bg-[#9f401c]"
                                        asChild
                                    >
                                        <Link href={route('admin.users')}>Manage Users</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <AdminStatCard
                            href={canManageUsers ? route('admin.users') : undefined}
                            label="Total Users"
                            value={stats.total_users}
                            meta={`${stats.active_users} active accounts`}
                            icon={<Users className="h-5 w-5" />}
                        />
                        <AdminStatCard
                            href={canManageSessions ? route('admin.sessions') : undefined}
                            label="Active Sessions"
                            value={stats.active_sessions}
                            meta="Currently authenticated across the platform"
                            icon={<ShieldCheck className="h-5 w-5" />}
                            iconTone="bg-[#edf7f2] text-emerald-700"
                        />
                        <AdminStatCard
                            href={canViewDocuments ? route('admin.documents') : undefined}
                            label="Total Documents"
                            value={stats.total_documents}
                            meta="Encrypted files currently stored"
                            icon={<FileText className="h-5 w-5" />}
                            iconTone="bg-[#fef4ec] text-[#b24b23]"
                        />
                        <AdminStatCard
                            href={canViewDocuments ? route('admin.documents') : undefined}
                            label="Vault Storage"
                            value={`${storageUsedPct.toFixed(0)}%`}
                            meta={`${formatBytes(stats.vault_storage)} of ${formatBytes(storage_limit)} used`}
                            icon={<Database className="h-5 w-5" />}
                            iconTone="bg-[#f7efe8] text-stone-700"
                            footer={
                                <Progress
                                    value={storageUsedPct}
                                    className="h-2 bg-stone-200"
                                    indicatorClassName={storageBarClass}
                                />
                            }
                        />
                        <AdminStatCard
                            href={
                                canViewAuditLogs
                                    ? route('admin.audit-logs', {
                                          category: 'security',
                                          action: 'login_failed',
                                      })
                                    : undefined
                            }
                            label="Failed Logins"
                            value={stats.failed_logins_24h}
                            meta="Recorded in the last 24 hours"
                            valueClassName={failedLoginClass}
                            icon={<AlertTriangle className="h-5 w-5" />}
                            iconTone="bg-[#fff0ea] text-red-600"
                        />
                        <AdminStatCard
                            href={
                                canManageUsers
                                    ? route('admin.users', { verification: 'unverified' })
                                    : undefined
                            }
                            label="Pending Verification"
                            value={stats.pending_verifications}
                            meta="Users still missing email verification"
                            valueClassName={pendingVerificationClass}
                            icon={<UserCheck className="h-5 w-5" />}
                            iconTone="bg-[#fdf1ea] text-[#b24b23]"
                        />
                    </div>

                    <Card className="overflow-hidden rounded-[30px] border border-[#ebd4c8] bg-white/95 shadow-sm">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between border-b border-[#eddcd3] px-6 py-5">
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-semibold text-stone-950">
                                        Successful logins - last 7 days
                                    </h3>
                                    <p className="text-sm text-stone-500">
                                        Daily authentication volume across the platform.
                                    </p>
                                </div>
                            </div>
                            <div className="px-2 py-4 sm:px-6">
                                <LoginChart data={login_chart} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-[30px] border border-[#ebd4c8] bg-white/95 shadow-sm">
                        <CardContent className="p-0">
                            <div className="flex flex-col gap-4 border-b border-[#eddcd3] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-stone-900">
                                        <Clock3 className="h-4 w-4 text-[#b24b23]" />
                                        <h3 className="text-2xl font-semibold">Recent System Activity</h3>
                                    </div>
                                    <p className="text-sm text-stone-500">
                                        Security events only - last 10 entries.
                                    </p>
                                </div>
                                {canViewAuditLogs && (
                                    <Button
                                        variant="outline"
                                        className="h-11 rounded-2xl border-[#d7c3b7] bg-white px-4 text-stone-700"
                                        asChild
                                    >
                                        <Link href={route('admin.audit-logs', { category: 'security' })}>
                                            View All Logs
                                        </Link>
                                    </Button>
                                )}
                            </div>

                            <Table>
                                <TableHeader className="bg-[#fff8f4] [&_tr]:border-[#eddcd3]">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="py-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Timestamp
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            User
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Action
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            IP Address
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recent_activity.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-sm text-stone-500">
                                                No recent system activity recorded.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recent_activity.map((log, index) => (
                                            <TableRow
                                                key={`${log.action}-${log.created_at}-${index}`}
                                                className="border-[#f0e1d8] hover:bg-[#fffaf7]"
                                            >
                                                <TableCell className="whitespace-nowrap py-5 text-sm text-stone-600">
                                                    {format(new Date(log.created_at), 'MMM dd, yyyy hh:mm a')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar
                                                            user={{
                                                                name: log.user?.name ?? 'System',
                                                                email: log.user?.email ?? null,
                                                                avatar_url: log.user?.avatar_url ?? null,
                                                            }}
                                                            size="sm"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium text-stone-950">
                                                                {log.user?.name ?? 'System'}
                                                            </div>
                                                            <div className="text-xs text-stone-500">
                                                                {log.user?.email ?? 'Automated process'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const badge = getAuditActionBadge(log.action);

                                                        return (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${badge.className}`}
                                                                        >
                                                                            {badge.label}
                                                                        </Badge>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{log.category === 'security' ? 'Security event' : 'Audit event'}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="rounded-full bg-[#f7efe9] px-3 py-1 font-mono text-xs text-stone-600">
                                                        {log.ip_address ?? '-'}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
