import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
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
    ip_address: string | null;
    created_at: string;
    user: {
        name: string;
        email: string;
        avatar_url: string | null;
    } | null;
}

interface Props {
    stats: Stats;
    recent_activity: ActivityItem[];
}

const avatarColors = [
    'bg-amber-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-violet-600',
    'bg-orange-600',
    'bg-teal-600',
];

function getAvatarColor(name: string) {
    return avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : parts[0]?.[1] ?? '';
    return `${first}${last}`.toUpperCase();
}

function formatStorage(bytes: number) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getActionBadge(action: string) {
    switch (action) {
        case 'login_success':
            return (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                    LOGIN SUCCESS
                </Badge>
            );
        case 'login_failed':
            return <Badge className="bg-destructive/15 text-destructive">LOGIN FAILED</Badge>;
        case 'logout':
            return (
                <Badge variant="outline" className="bg-muted text-muted-foreground">
                    LOGOUT
                </Badge>
            );
        case 'document_uploaded':
            return <Badge className="bg-primary/15 text-primary">DOCUMENT UPLOADED</Badge>;
        case 'document_downloaded':
            return <Badge className="bg-primary/15 text-primary">DOCUMENT DOWNLOADED</Badge>;
        case 'document_shared':
            return (
                <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    DOCUMENT SHARED
                </Badge>
            );
        case 'document_deleted':
            return (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    DOCUMENT DELETED
                </Badge>
            );
        case 'two_factor_enabled':
        case '2fa_enabled':
            return (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">
                    2FA ENABLED
                </Badge>
            );
        case 'account_locked':
            return <Badge className="bg-destructive/15 text-destructive">ACCOUNT LOCKED</Badge>;
        case 'integrity_violation':
            return <Badge className="bg-destructive/15 text-destructive">INTEGRITY VIOLATION</Badge>;
        default:
            return <Badge className="bg-muted text-muted-foreground">{action.toUpperCase()}</Badge>;
    }
}

function StatCard({
    href,
    label,
    value,
    subLabel,
    icon,
    tooltip,
    warning = false,
}: {
    href: string;
    label: string;
    value: string | number;
    subLabel: string;
    icon: React.ReactNode;
    tooltip: string;
    warning?: boolean;
}) {
    return (
        <Link href={href}>
            <Card
                className={`cursor-pointer transition-colors hover:border-primary/50 ${
                    warning ? 'border-amber-500/30 bg-amber-500/5' : ''
                }`}
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
                <CardContent>
                    <div className="text-3xl font-bold text-foreground">{value}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{subLabel}</p>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function AdminDashboard({ stats, recent_activity }: Props) {
    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">Admin Dashboard</h2>
                    <p className="text-sm text-muted-foreground">System overview and security monitoring.</p>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbPage>Admin Dashboard</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Admin Dashboard" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                            href={route('admin.users')}
                            label="Total Users"
                            value={stats.total_users}
                            subLabel={`${stats.active_users} active accounts`}
                            icon={<Users className="h-4 w-4 text-muted-foreground" />}
                            tooltip="All registered users"
                        />
                        <StatCard
                            href={route('admin.sessions')}
                            label="Active Sessions"
                            value={stats.active_sessions}
                            subLabel="System-wide active logins"
                            icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                            tooltip="Current active authenticated sessions"
                        />
                        <StatCard
                            href={route('admin.documents')}
                            label="Total Documents"
                            value={stats.total_documents}
                            subLabel="Encrypted files in vault"
                            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                            tooltip="All stored documents"
                        />
                        <StatCard
                            href={route('admin.documents')}
                            label="Vault Storage"
                            value={formatStorage(stats.vault_storage)}
                            subLabel="Cumulative encrypted size"
                            icon={<Database className="h-4 w-4 text-muted-foreground" />}
                            tooltip="Total encrypted storage usage"
                        />
                        <StatCard
                            href={route('admin.audit-logs')}
                            label="Failed Logins (24h)"
                            value={stats.failed_logins_24h}
                            subLabel="Security authentication attempts"
                            icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                            tooltip="Recent failed authentication attempts"
                            warning={stats.failed_logins_24h > 0}
                        />
                        <StatCard
                            href={route('admin.users')}
                            label="Pending Verifications"
                            value={stats.pending_verifications}
                            subLabel="Users without verified email"
                            icon={<UserCheck className="h-4 w-4 text-muted-foreground" />}
                            tooltip="Accounts pending email verification"
                        />
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                <div>
                                    <CardTitle className="font-semibold text-foreground">
                                        Recent System Activity
                                    </CardTitle>
                                    <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                                        Last 10 audit log entries across the system
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                                <Link href={route('admin.audit-logs')}>View All Logs</Link>
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
                                                    {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-7 w-7">
                                                            <AvatarImage
                                                                src={log.user?.avatar_url ?? undefined}
                                                                alt={log.user?.name ?? 'System'}
                                                            />
                                                            <AvatarFallback
                                                                className={`text-xs text-white ${getAvatarColor(
                                                                    log.user?.name ?? 'S'
                                                                )}`}
                                                            >
                                                                {getInitials(log.user?.name ?? 'S')}
                                                            </AvatarFallback>
                                                        </Avatar>
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
                                                <TableCell>{getActionBadge(log.action)}</TableCell>
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
