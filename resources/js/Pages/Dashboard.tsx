import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { 
    FileText, 
    HardDrive, 
    Share2, 
    Upload, 
    ChevronRight,
    ArrowUpRight,
    History,
    Trash2,
    Activity,
    Users as UsersIcon
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
        created_at: string;
    }>;
}

export default function Dashboard({ stats, recentActivity, auth }: DashboardProps) {
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
            case 'upload': return 'text-blue-600 bg-blue-50 border-blue-100';
            case 'delete': return 'text-red-600 bg-red-50 border-red-100';
            case 'share': return 'text-amber-600 bg-amber-50 border-amber-100';
            case 'download': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
            case 'login': return 'text-indigo-600 bg-indigo-50 border-indigo-100';
            default: return 'text-zinc-600 bg-zinc-50 border-zinc-100';
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            {/* Dashboard Header */}
            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
                                Overview
                            </h1>
                            <p className="mt-2 text-zinc-500 max-w-2xl">
                                Welcome back, <span className="text-indigo-600 font-semibold">{auth.user.name}</span>. 
                                SecureVault is protecting your data with state-of-the-art encryption.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link href={route('documents.create')}>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 px-6">
                                    <Upload className="mr-2 h-4 w-4" />
                                    New Upload
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid gap-6 md:grid-cols-3 mt-10">
                        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-indigo-600">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FileText size={80} />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent pointer-events-none" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">My Documents</CardTitle>
                                <div className="p-2 bg-indigo-50 rounded-lg">
                                    <FileText className="h-4 w-4 text-indigo-600" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-zinc-900">{stats.myDocuments}</div>
                                <p className="text-sm text-zinc-500 mt-1">Encrypted personal files</p>
                            </CardContent>
                        </Card>
                        
                        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-emerald-600">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Share2 size={80} />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent pointer-events-none" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Shared With Me</CardTitle>
                                <div className="p-2 bg-emerald-50 rounded-lg">
                                    <Share2 className="h-4 w-4 text-emerald-600" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-zinc-900">{stats.sharedWithMe}</div>
                                <p className="text-sm text-zinc-500 mt-1">Files accessible to you</p>
                            </CardContent>
                        </Card>
                        
                        <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-l-4 border-l-amber-600">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <HardDrive size={80} />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-transparent pointer-events-none" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Storage Used</CardTitle>
                                <div className="p-2 bg-amber-50 rounded-lg">
                                    <HardDrive className="h-4 w-4 text-amber-600" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-zinc-900">{stats.storageUsed}</div>
                                <p className="text-sm text-zinc-500 mt-1">Physical vault space</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-5 mt-10">
                        {/* Quick Actions & Maintenance */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-zinc-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <ArrowUpRight className="h-5 w-5 text-indigo-600" />
                                        Quick Navigation
                                    </CardTitle>
                                    <CardDescription>Commonly used workspace tools</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-3">
                                    <Link href={route('documents.index')}>
                                        <Button variant="outline" className="w-full justify-between group hover:bg-zinc-50">
                                            <span className="flex items-center">
                                                <FileText className="mr-3 h-4 w-4 text-zinc-400 group-hover:text-indigo-600" />
                                                Browse All Files
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500" />
                                        </Button>
                                    </Link>
                                    <Link href={route('shared.index')}>
                                        <Button variant="outline" className="w-full justify-between group hover:bg-zinc-50">
                                            <span className="flex items-center">
                                                <UsersIcon className="mr-3 h-4 w-4 text-zinc-400 group-hover:text-emerald-600" />
                                                Shared Discovery
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500" />
                                        </Button>
                                    </Link>
                                    <Link href={route('documents.trash')}>
                                        <Button variant="outline" className="w-full justify-between group hover:bg-zinc-50">
                                            <span className="flex items-center">
                                                <Trash2 className="mr-3 h-4 w-4 text-zinc-400 group-hover:text-red-600" />
                                                Vault Recovery
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-500" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-950 text-white border-none shadow-indigo-950/20 shadow-xl overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-transparent" />
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <History className="h-5 w-5 text-indigo-400" />
                                        System Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4 relative z-10">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-zinc-400">Encryption Status</span>
                                            <Badge variant="outline" className="text-emerald-400 border-emerald-400/30 bg-emerald-400/10">Active/AES-256</Badge>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-zinc-400">Audit Trail Integrity</span>
                                            <Badge variant="outline" className="text-indigo-400 border-indigo-400/30 bg-indigo-400/10">Verified</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Recent Activity Feed */}
                        <div className="lg:col-span-3">
                            <Card className="h-full border-zinc-200">
                                <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-100 pb-6 mb-2">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Activity className="h-5 w-5 text-indigo-600" />
                                            Recent Activity
                                        </CardTitle>
                                        <CardDescription>The most recent actions in your vault</CardDescription>
                                    </div>
                                    <Link href={route('activity.index')}>
                                        <Button variant="link" className="text-indigo-600 font-semibold text-sm h-auto p-0 hover:no-underline hover:text-indigo-700">
                                            View logs
                                        </Button>
                                    </Link>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {recentActivity.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                                            <History className="h-10 w-10 mb-4 opacity-20" />
                                            <p className="text-sm">No activity recorded for this session yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {recentActivity.map((log) => (
                                                <div key={log.id} className="flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className={cn("capitalize px-2 py-0.5 text-[11px] font-bold tracking-tight rounded-md", getActionColor(log.action))}>
                                                            {log.action}
                                                        </Badge>
                                                        <span className="text-sm font-medium text-zinc-900 uppercase tracking-tighter opacity-70">
                                                            Action logged by system
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-semibold text-zinc-400">
                                                        {handleFormatDate(log.created_at)}
                                                    </span>
                                                </div>
                                            ))}
                                            
                                            {recentActivity.length > 0 && (
                                                <div className="pt-6 border-t border-zinc-100">
                                                    <p className="text-xs text-zinc-400 text-center italic font-medium">
                                                        End-to-end audit logging is enabled for all vault operations.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}



