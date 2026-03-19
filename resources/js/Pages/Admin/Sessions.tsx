import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { Monitor, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
    currentSessionId: string;
}

export default function AdminSessions({ sessions, currentSessionId }: Props) {
    const [showAnonymousSessions, setShowAnonymousSessions] = useState(false);
    const [sessionToTerminate, setSessionToTerminate] = useState<Session | null>(null);

    const visibleSessions = useMemo(() => {
        if (showAnonymousSessions) {
            return sessions;
        }

        return sessions.filter((session) => session.user_id !== null);
    }, [sessions, showAnonymousSessions]);

    const parseDeviceDetail = (userAgent: string | null) => {
        const value = (userAgent || '').toLowerCase();

        let browser = 'Unknown Client';
        if (value.includes('powershell')) browser = 'PowerShell';
        else if (value.includes('edg/')) browser = 'Edge';
        else if (value.includes('chrome') && !value.includes('edg/')) browser = 'Chrome';
        else if (value.includes('firefox')) browser = 'Firefox';
        else if (value.includes('safari') && !value.includes('chrome')) browser = 'Safari';
        else if (value.includes('postman')) browser = 'Postman';
        else if (value.includes('curl')) browser = 'cURL';

        let os = 'Unknown OS';
        if (value.includes('windows')) os = 'Windows';
        else if (value.includes('mac os x') || value.includes('macintosh')) os = 'macOS';
        else if (value.includes('iphone') || value.includes('ipad') || value.includes('ios')) os = 'iOS';
        else if (value.includes('android')) os = 'Android';
        else if (value.includes('linux')) os = 'Linux';

        return `${browser} on ${os}`;
    };

    const confirmTerminate = () => {
        if (!sessionToTerminate) return;

        router.delete(route('admin.sessions.destroy', sessionToTerminate.id), {
            onSuccess: () => toast.success('Session terminated successfully'),
            onFinish: () => setSessionToTerminate(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold leading-tight text-foreground">
                        Active Session Monitoring
                    </h2>
                    <Badge variant="secondary" className="bg-secondary text-muted-foreground">
                        {visibleSessions.length}
                    </Badge>
                </div>
            }
        >
            <Head title="System Sessions" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader className="border-b">
                            <label className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Checkbox
                                    checked={showAnonymousSessions}
                                    onCheckedChange={(checked) => setShowAnonymousSessions(checked === true)}
                                />
                                <span>Show anonymous sessions</span>
                            </label>
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
                                    {visibleSessions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                No active sessions found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        visibleSessions.map((session) => {
                                            const isCurrentSession = session.id === currentSessionId;

                                            return (
                                                <TableRow
                                                    key={session.id}
                                                    className={cn(isCurrentSession && 'bg-accent/40')}
                                                >
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm">
                                                                    {session.user_name || 'Guest'}
                                                                </span>
                                                                {isCurrentSession && (
                                                                    <Badge className="border border-[#1E3A24] bg-[#132B1A] text-[#4ADE80] hover:bg-[#132B1A]">
                                                                        Current
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {session.user_email || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono">
                                                        {session.ip_address || 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {formatDistanceToNow(new Date(session.last_activity * 1000))} ago
                                                    </TableCell>
                                                    <TableCell className="max-w-[280px]">
                                                        <div
                                                            className="flex items-center gap-2 text-xs text-muted-foreground"
                                                            title={session.user_agent || 'Unknown user agent'}
                                                        >
                                                            <Monitor className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate">
                                                                {parseDeviceDetail(session.user_agent)}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[#F87171] hover:bg-[rgba(179,58,58,0.1)] hover:text-[#F87171] disabled:text-muted-foreground disabled:hover:bg-transparent"
                                                            disabled={isCurrentSession}
                                                            onClick={() => setSessionToTerminate(session)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" /> Terminate
                                                        </Button>
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

            <Dialog open={sessionToTerminate !== null} onOpenChange={(open) => !open && setSessionToTerminate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminate Session</DialogTitle>
                        <DialogDescription>
                            {sessionToTerminate
                                ? `Are you sure you want to terminate the session for ${sessionToTerminate.user_name || 'this user'}?`
                                : 'Are you sure you want to terminate this session?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSessionToTerminate(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmTerminate}>
                            Terminate Session
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
