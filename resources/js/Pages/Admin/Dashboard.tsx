import { Badge } from '@/components/ui/badge';
import { LoginChart } from '@/components/LoginChart';
import { TimeBasedGreeting } from '@/components/TimeBasedGreeting';
import UserAvatar from '@/components/UserAvatar';
import { Progress } from '@/components/ui/progress';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
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
    Clock,
    Database,
    FileText,
    ShieldCheck,
    UserCheck,
    Users,
} from 'lucide-react';

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

function StatCard({
    href,
    label,
    value,
    subLabel,
    valueClassName,
    footer,
    icon,
    tooltip,
    warning = false,
}: {
    href?: string;
    label: string;
    value: React.ReactNode;
    subLabel: React.ReactNode;
    valueClassName?: string;
    footer?: React.ReactNode;
    icon: React.ReactNode;
    tooltip: string;
    warning?: boolean;
}) {
    const card = (
        <Card
            className={cn(
                'flex h-full flex-col transition-colors',
                href ? 'cursor-pointer hover:border-primary/50' : 'cursor-default',
                warning && 'border-amber-500/30 bg-amber-500/5',
            )}
        >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                </CardTitle>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="cursor-help rounded-lg bg-muted p-2">{icon}</div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{tooltip}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
                <div className={cn('text-3xl font-bold text-foreground', valueClassName)}>{value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{subLabel}</p>
                {footer ? <div className="mt-auto">{footer}</div> : null}
            </CardContent>
        </Card>
    );

    if (!href) {
        return card;
    }

    return <Link href={href} className="block h-full">{card}</Link>;
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
    const firstName = auth.user.name.split(/\s+/)[0] ?? auth.user.name;
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
            : 'bg-primary';

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">Admin Dashboard</h2>
                    <TimeBasedGreeting firstName={firstName} />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={route('dashboard')}>Main</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Admin</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Admin Dashboard" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                            href={canManageUsers ? route('admin.users') : undefined}
                            label="Total Users"
                            value={stats.total_users}
                            subLabel={`${stats.active_users} active accounts`}
                            icon={<Users className="h-4 w-4 text-muted-foreground" />}
                            tooltip="All registered users"
                        />
                        <StatCard
                            href={canManageSessions ? route('admin.sessions') : undefined}
                            label="Active Sessions"
                            value={stats.active_sessions}
                            subLabel="System-wide active logins"
                            icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                            tooltip="Current active authenticated sessions"
                        />
                        <StatCard
                            href={canViewDocuments ? route('admin.documents') : undefined}
                            label="Total Documents"
                            value={stats.total_documents}
                            subLabel="Encrypted files in vault"
                            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                            tooltip="All stored documents"
                        />
                        <StatCard
                            href={canViewDocuments ? route('admin.documents') : undefined}
                            label="Vault Storage"
                            value={formatBytes(stats.vault_storage)}
                            subLabel="Cumulative encrypted size"
                            footer={
                                <>
                                    <Progress
                                        value={storageUsedPct}
                                        className="mt-3 h-1.5"
                                        indicatorClassName={storageBarClass}
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {formatBytes(stats.vault_storage)} of {formatBytes(storage_limit)} used
                                    </p>
                                </>
                            }
                            icon={<Database className="h-4 w-4 text-muted-foreground" />}
                            tooltip="Total encrypted storage usage"
                        />
                        <StatCard
                            href={canViewAuditLogs ? route('admin.audit-logs', { category: 'security', action: 'login_failed' }) : undefined}
                            label="Failed Logins (24h)"
                            value={stats.failed_logins_24h}
                            subLabel="Security authentication attempts"
                            valueClassName={failedLoginClass}
                            icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                            tooltip="Recent failed authentication attempts"
                        />
                        <StatCard
                            href={canManageUsers ? route('admin.users', { verification: 'unverified' }) : undefined}
                            label="Pending Verifications"
                            value={stats.pending_verifications}
                            subLabel="Users without verified email"
                            valueClassName={pendingVerificationClass}
                            icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
                            tooltip="Accounts pending email verification"
                        />
                    </div>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-foreground">
                                Successful logins - last 7 days
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <LoginChart data={login_chart} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <div>
                                    <CardTitle className="font-semibold text-foreground">
                                        Recent System Activity
                                    </CardTitle>
                                    <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                                        Security events only · Last 10 entries
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={route('admin.audit-logs', { category: 'security' })}>View All Logs</Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>IP Address</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recent_activity.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                                                No recent system activity recorded.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recent_activity.map((log, index) => (
                                            <TableRow
                                                key={`${log.action}-${log.created_at}-${index}`}
                                                className="hover:bg-muted/50"
                                            >
                                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                    {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <UserAvatar
                                                            user={{
                                                                name: log.user?.name ?? 'System',
                                                                email: log.user?.email ?? null,
                                                                avatar_url: log.user?.avatar_url ?? null,
                                                            }}
                                                            size="sm"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-medium text-foreground">
                                                                {log.user?.name ?? (
                                                                    <span className="italic text-muted-foreground">
                                                                        System
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {log.user?.email && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {log.user.email}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {(() => {
                                                        const badge = getAuditActionBadge(log.action);

                                                        return (
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs font-medium uppercase tracking-wide ${badge.className}`}
                                                            >
                                                                {badge.label}
                                                            </Badge>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
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
