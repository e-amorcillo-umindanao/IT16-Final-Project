import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { Monitor, ShieldAlert, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Session {
    id: string;
    user_id: number | null;
    ip_address: string;
    user_agent: string;
    last_activity: number;
    user_name: string | null;
    user_email: string | null;
}

interface Props {
    sessions: Session[];
}

export default function AdminSessions({ sessions }: Props) {
    const terminateSession = (id: string, userName: string | null) => {
        if (!confirm(`Are you sure you want to terminate the session for ${userName || 'this user'}?`)) return;

        router.delete(route('admin.sessions.destroy', id), {
            onSuccess: () => toast.success('Session terminated successfully'),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Active Session Monitoring
                </h2>
            }
        >
            <Head title="System Sessions" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-500 flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" /> Global Active Sessions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Last Activity</TableHead>
                                        <TableHead>Device Detail</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                                                No active sessions found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sessions.map((session) => (
                                            <TableRow key={session.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{session.user_name || 'Guest'}</span>
                                                        <span className="text-xs text-gray-400">{session.user_email || 'N/A'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-mono">{session.ip_address}</TableCell>
                                                <TableCell className="text-xs">
                                                    {formatDistanceToNow(new Date(session.last_activity * 1000))} ago
                                                </TableCell>
                                                <TableCell className="max-w-[300px]">
                                                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                                        <Monitor className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">{session.user_agent}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => terminateSession(session.id, session.user_name)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" /> Terminate
                                                    </Button>
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
