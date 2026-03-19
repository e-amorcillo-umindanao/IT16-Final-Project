import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { AlertTriangle, Clock3, Database, FileText, Shield, UserCheck, Users } from 'lucide-react';

interface Stats {
    total_users: number;
    active_users: number;
    pending_verifications: number;
    total_documents: number;
    total_storage: number;
    failed_logins_24h: number;
    active_sessions: number;
}

interface ActivityLog {
    id: number;
    action: string;
    ip_address: string | null;
    created_at: string;
    user: {
        name: string;
        email: string;
    } | null;
}

interface Props {
    stats: Stats;
    recentActivity: ActivityLog[];
}

export default function AdminDashboard({ stats, recentActivity }: Props) {
    const formatStorage = (bytes: number) => {
        if (bytes === 0) return '—';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const value = bytes / Math.pow(k, i);

        return `${value >= 10 ? value.toFixed(0) : value.toFixed(2)} ${sizes[i]}`;
    };

    const getFailedLoginStyles = () => {
        if (stats.failed_logins_24h >= 10) {
            return {
                card: 'border-[#5A2020] bg-[#2D1010]',
                icon: 'text-[#F87171]',
                value: 'text-[#F87171] font-extrabold',
            };
        }

        if (stats.failed_logins_24h >= 1) {
            return {
                card: 'border-[#3F2E11] bg-[#2A2010]',
                icon: 'text-primary',
                value: 'text-primary',
            };
        }

        return {
            card: '',
            icon: 'text-muted-foreground',
            value: '',
        };
    };

    const getActionBadgeClass = (action: string) => {
        const variants: Record<string, string> = {
            login: 'bg-[#0F1B2D] text-[#60A5FA] border-[#17304F]',
            login_failed: 'bg-[#2D1010] text-[#F87171] border-[#5A2020]',
            failed_login: 'bg-[#2D1010] text-[#F87171] border-[#5A2020]',
            document_uploaded: 'bg-[#132B1A] text-[#4ADE80] border-[#1E3A24]',
            document_deleted: 'bg-[#2A2010] text-primary border-[#3F2E11]',
            user_status_changed: 'bg-[#2A2010] text-primary border-[#3F2E11]',
            user_role_changed: 'bg-[#0F1B2D] text-[#60A5FA] border-[#17304F]',
            admin_session_terminated: 'bg-[#2D1010] text-[#F87171] border-[#5A2020]',
        };

        return variants[action] ?? 'bg-secondary text-muted-foreground border-border';
    };

    const failedLoginStyles = getFailedLoginStyles();

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-semibold leading-tight text-foreground">
                        Admin Dashboard
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        System overview and security monitoring
                    </p>
                </div>
            }
        >
            <Head title="Admin Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_users}</div>
                                <p className="text-xs text-muted-foreground">
                                    {stats.active_users} active accounts
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                                <Shield className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.active_sessions}</div>
                                <p className="text-xs text-muted-foreground">
                                    System-wide active logins
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_documents}</div>
                                <p className="text-xs text-muted-foreground">
                                    Encrypted files in vault
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Vault Storage</CardTitle>
                                <Database className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatStorage(stats.total_storage)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Cumulative encrypted size
                                </p>
                            </CardContent>
                        </Card>

                        <Card className={failedLoginStyles.card}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Failed Logins (24h)</CardTitle>
                                <AlertTriangle className={cn('h-4 w-4', failedLoginStyles.icon)} />
                            </CardHeader>
                            <CardContent>
                                <div className={cn('text-2xl font-bold', failedLoginStyles.value)}>
                                    {stats.failed_logins_24h}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Security authentication attempts
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.pending_verifications}</div>
                                <p className="text-xs text-muted-foreground">
                                    Users without verified email
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-4">
                            <div>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                    <Clock3 className="h-5 w-5 text-primary" />
                                    Recent System Activity
                                </CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Last 10 audit log entries across the system
                                </p>
                            </div>
                            <Button variant="outline" asChild>
                                <Link href={route('admin.audit-logs')}>View all logs</Link>
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
                                    {recentActivity.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                                                No recent system activity recorded.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recentActivity.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">
                                                            {log.user?.name || 'System'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {log.user?.email || 'N/A'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn('capitalize', getActionBadgeClass(log.action))}
                                                    >
                                                        {log.action.replaceAll('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {log.ip_address || 'N/A'}
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
