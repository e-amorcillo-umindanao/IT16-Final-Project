import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { AlertTriangle, Database, FileText, Shield, Users } from 'lucide-react';

interface Stats {
    total_users: number;
    active_users: number;
    total_documents: number;
    total_storage: number;
    failed_logins_24h: number;
    active_sessions: number;
}

interface Props {
    stats: Stats;
}

export default function AdminDashboard({ stats }: Props) {
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Admin Dashboard
                </h2>
            }
        >
            <Head title="Admin Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Users Stat */}
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

                        {/* Sessions Stat */}
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

                        {/* Documents Stat */}
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

                        {/* Storage Stat */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Vault Storage</CardTitle>
                                <Database className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatBytes(stats.total_storage)}</div>
                                <p className="text-xs text-muted-foreground">
                                    Cumulative encrypted size
                                </p>
                            </CardContent>
                        </Card>

                        {/* Failed Logins Stat */}
                        <Card className={stats.failed_logins_24h > 10 ? 'border-red-200 bg-red-50/50' : ''}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Failed Logins (24h)</CardTitle>
                                <AlertTriangle className={`h-4 w-4 ${stats.failed_logins_24h > 10 ? 'text-red-600' : 'text-muted-foreground'}`} />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${stats.failed_logins_24h > 10 ? 'text-red-600' : ''}`}>
                                    {stats.failed_logins_24h}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Security authentication attempts
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
