import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    HardDrive,
    History,
    Info,
    FileText,
    Share2,
    Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardProps extends PageProps {
    stats: {
        myDocuments: number;
        sharedWithMe: number;
        storageUsed: string;
    };
    recentActivity: Array<{
        id: number;
        action: string;
        description: string;
        created_at: string;
    }>;
    displayName: string;
}

export default function Dashboard({ stats, recentActivity, displayName }: DashboardProps) {
    const handleFormatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(dateString));
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'document_uploaded':
                return 'border-[#1E3A24] bg-[#132B1A] text-[#4ADE80]';
            case 'document_deleted':
                return 'border-[#5A2020] bg-[#2D1010] text-[#F87171]';
            case 'document_shared':
            case 'share_revoked':
                return 'border-[#3F2E11] bg-[#2A2010] text-primary';
            case 'document_downloaded':
                return 'border-[#17304F] bg-[#0F1B2D] text-[#60A5FA]';
            case 'user_role_changed':
            case 'user_status_changed':
            case 'admin_session_terminated':
                return 'border-[#17304F] bg-[#0F1B2D] text-[#60A5FA]';
            case 'document_restored':
                return 'border-[#3F2E11] bg-[#2A2010] text-primary';
            case 'login_success':
            case 'login':
                return 'border-[#1E3A24] bg-[#132B1A] text-[#4ADE80]';
            case 'logout':
                return 'border-border bg-secondary text-muted-foreground';
            default:
                return 'border-border bg-secondary text-muted-foreground';
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'document_uploaded':
                return 'Upload';
            case 'document_deleted':
                return 'Delete';
            case 'document_shared':
                return 'Share';
            case 'share_revoked':
                return 'Revoke';
            case 'document_downloaded':
                return 'Download';
            case 'document_restored':
                return 'Restore';
            case 'login_success':
            case 'login':
                return 'Login';
            case 'logout':
                return 'Logout';
            case 'user_role_changed':
                return 'Role Changed';
            case 'user_status_changed':
                return 'Status Changed';
            case 'admin_session_terminated':
                return 'Session Ended';
            default:
                return action
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, (char) => char.toUpperCase());
        }
    };

    const getActivityDescription = (action: string, description: string) => {
        if (action === 'user_role_changed') {
            if (/performed an account action/i.test(description)) {
                return 'User role was updated';
            }

            return description;
        }

        return description;
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                Dashboard
                            </h1>
                            <p className="mt-2 max-w-2xl text-muted-foreground">
                                Welcome back, <span className="font-semibold text-foreground">{displayName}</span>.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href={route('documents.create')}>
                                <Button className="bg-[#D4A843] px-6 text-[#0A0A0A] hover:bg-[#E0B84D]">
                                    <Upload className="mr-2 h-4 w-4" />
                                    New Upload
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="mt-10 grid gap-6 md:grid-cols-3">
                        <Card className="transition-shadow hover:border-[#333330]">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground">My Documents</CardTitle>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-foreground">{stats.myDocuments}</div>
                                <p className="mt-1 text-sm text-muted-foreground">Encrypted personal files</p>
                            </CardContent>
                        </Card>

                        <Card className="transition-shadow hover:border-[#333330]">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground">Shared with Me</CardTitle>
                                <Share2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-foreground">{stats.sharedWithMe}</div>
                                <p className="mt-1 text-sm text-muted-foreground">Files accessible to you</p>
                            </CardContent>
                        </Card>

                        <Card className="transition-shadow hover:border-[#333330]">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold tracking-tight text-muted-foreground">Storage Used</CardTitle>
                                <HardDrive className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-foreground">{stats.storageUsed}</div>
                                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                    <span>Physical vault space</span>
                                    <span title="Only your uploaded files count toward storage.">
                                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="mb-20 mt-10">
                        <Card className="h-full transition-shadow hover:border-[#333330]">
                            <CardHeader className="mb-2 flex flex-row items-center justify-between border-b border-border pb-6">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Activity className="h-5 w-5 text-primary" />
                                        Recent Activity
                                    </CardTitle>
                                    <CardDescription>Your latest actions in SecureVault</CardDescription>
                                </div>
                                <Link href={route('activity.index')}>
                                    <Button variant="outline" className="border-[#2A2A28] text-sm font-semibold">
                                        View All Logs
                                    </Button>
                                </Link>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {recentActivity.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                        <History className="mb-4 h-10 w-10 opacity-20" />
                                        <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Your recent uploads, downloads, and security events will appear here.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {recentActivity.map((log) => (
                                            <div
                                                key={log.id}
                                                className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'min-w-24 justify-center px-2 py-0.5 text-[11px] font-bold tracking-tight rounded-md',
                                                            getActionColor(log.action)
                                                        )}
                                                    >
                                                        {getActionLabel(log.action)}
                                                    </Badge>
                                                    <span className="text-sm font-medium text-foreground">
                                                        {getActivityDescription(log.action, log.description)}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-semibold text-muted-foreground">
                                                    {handleFormatDate(log.created_at)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
