import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import GravatarAvatar from '@/components/GravatarAvatar';
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
            return { label: 'LOGIN SUCCESS', className: 'bg-green-500/15 text-green-700 dark:text-green-400' };
        case 'login_failed':
            return { label: 'LOGIN FAILED', className: 'bg-destructive/15 text-destructive' };
        case 'logout':
            return { label: 'LOGOUT', className: 'border border-border bg-muted text-muted-foreground' };
        case 'document_uploaded':
            return { label: 'DOCUMENT UPLOADED', className: 'bg-primary/15 text-primary' };
        case 'document_downloaded':
            return { label: 'DOCUMENT DOWNLOADED', className: 'bg-primary/15 text-primary' };
        case 'document_shared':
            return { label: 'DOCUMENT SHARED', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' };
        case 'document_deleted':
            return { label: 'DOCUMENT DELETED', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
        case 'two_factor_enabled':
        case '2fa_enabled':
            return { label: '2FA ENABLED', className: 'bg-green-500/15 text-green-700 dark:text-green-400' };
        case 'account_locked':
            return { label: 'ACCOUNT LOCKED', className: 'bg-destructive/15 text-destructive' };
        case 'integrity_violation':
            return { label: 'INTEGRITY VIOLATION', className: 'bg-destructive/15 text-destructive' };
        default:
            return { label: action.toUpperCase(), className: 'bg-muted text-muted-foreground' };
    }
}

function StatCard({
    href,
    label,
    value,
    subLabel,
    icon,
    warning = false,
}: {
    href: string;
    label: string;
    value: string | number;
    subLabel: string;
    icon: React.ReactNode;
    warning?: boolean;
}) {
    return (
        <Link href={href}>
            <Card
                className={`transition-colors hover:border-primary/50 ${
                    warning ? 'border-amber-500/30 bg-amber-500/5' : ''
                }`}
            >
                <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3">
                            <p
                                className={`text-xs font-semibold uppercase tracking-wider ${
                                    warning ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                                }`}
                            >
                                {label}
                            </p>
                            <p className="text-3xl font-bold text-foreground">{value}</p>
                            <p className="text-xs text-muted-foreground">{subLabel}</p>
                        </div>
                        <div
                            className={`rounded-lg p-2 ${
                                warning
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {icon}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function AdminDashboard({ stats, recent_activity }: Props) {
    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-2xl font-semibold text-foreground">Admin Dashboard</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        System overview and security monitoring.
                    </p>
                </div>
            }
        >
            <Head title="Admin Dashboard" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <StatCard
                            href={route('admin.users')}
                            label="Total Users"
                            value={stats.total_users}
                            subLabel={`${stats.active_users} active accounts`}
                            icon={<Users className="h-5 w-5" />}
                        />
                        <StatCard
                            href={route('admin.sessions')}
                            label="Active Sessions"
                            value={stats.active_sessions}
                            subLabel="System-wide active logins"
                            icon={<ShieldCheck className="h-5 w-5" />}
                        />
                        <StatCard
                            href={route('admin.documents')}
                            label="Total Documents"
                            value={stats.total_documents}
                            subLabel="Encrypted files in vault"
                            icon={<FileText className="h-5 w-5" />}
                        />
                        <StatCard
                            href={route('admin.documents')}
                            label="Vault Storage"
                            value={formatStorage(stats.vault_storage)}
                            subLabel="Cumulative encrypted size"
                            icon={<Database className="h-5 w-5" />}
                        />
                        <StatCard
                            href={route('admin.audit-logs')}
                            label="Failed Logins (24h)"
                            value={stats.failed_logins_24h}
                            subLabel="Security authentication attempts"
                            icon={<AlertTriangle className="h-5 w-5" />}
                            warning={stats.failed_logins_24h > 0}
                        />
                        <StatCard
                            href={route('admin.users')}
                            label="Pending Verifications"
                            value={stats.pending_verifications}
                            subLabel="Users without verified email"
                            icon={<UserCheck className="h-5 w-5" />}
                        />
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <div className="flex flex-col gap-4 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-5 w-5 text-primary" />
                                        <h3 className="font-semibold text-foreground">Recent System Activity</h3>
                                    </div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                        Last 10 audit log entries across the system
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={route('admin.audit-logs')}>View All Logs</Link>
                                </Button>
                            </div>

                            <Table>
                                <TableHeader className="bg-muted [&_tr]:border-border">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="bg-muted text-muted-foreground">Timestamp</TableHead>
                                        <TableHead className="bg-muted text-muted-foreground">User</TableHead>
                                        <TableHead className="bg-muted text-muted-foreground">Action</TableHead>
                                        <TableHead className="bg-muted text-muted-foreground">IP Address</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recent_activity.length === 0 ? (
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                                                No recent system activity recorded.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recent_activity.map((log, index) => {
                                            const badge = getActionBadge(log.action);

                                            return (
                                                <TableRow key={`${log.action}-${log.created_at}-${index}`} className="border-border hover:bg-muted/50">
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm')}
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.user ? (
                                                            <div className="flex items-center gap-3">
                                                                <GravatarAvatar 
                                                                    name={log.user.name} 
                                                                    avatarUrl={log.user.avatar_url} 
                                                                    size="sm" 
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-foreground">{log.user.name}</span>
                                                                    <span className="text-xs text-muted-foreground">{log.user.email}</span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                                    <Users className="h-4 w-4" />
                                                                </div>
                                                                <span className="text-sm italic text-muted-foreground">System</span>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${badge.className}`}>
                                                            {badge.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                        {log.ip_address || '—'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
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
