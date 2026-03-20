import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Monitor, ShieldOff, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import GravatarAvatar from '@/components/GravatarAvatar';

interface SessionRow {
    id: string;
    ip_address: string | null;
    last_activity: number;
    user_agent: string | null;
    user_name: string | null;
    user_email: string | null;
    user_avatar_url: string | null;
}

interface Props {
    sessions: SessionRow[];
    currentSessionId: string;
}



function formatLastActivity(unixTimestamp: number): string {
    const seconds = Math.floor(Date.now() / 1000) - unixTimestamp;
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
}

function getActivityDotClass(unixTimestamp: number) {
    const seconds = Math.floor(Date.now() / 1000) - unixTimestamp;
    if (seconds < 300) return 'text-green-500';
    if (seconds < 1800) return 'text-amber-500';
    return 'text-muted-foreground';
}

export default function AdminSessionsIndex({ sessions, currentSessionId }: Props) {
    const [search, setSearch] = useState('');
    const [sessionToTerminate, setSessionToTerminate] = useState<SessionRow | null>(null);
    const [showTerminateAllDialog, setShowTerminateAllDialog] = useState(false);

    const filteredSessions = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) {
            return sessions;
        }

        return sessions.filter((session) => {
            const name = session.user_name?.toLowerCase() ?? '';
            const email = session.user_email?.toLowerCase() ?? '';
            const ip = session.ip_address?.toLowerCase() ?? '';

            return name.includes(value) || email.includes(value) || ip.includes(value);
        });
    }, [search, sessions]);

    const confirmTerminate = () => {
        if (!sessionToTerminate) {
            return;
        }

        router.delete(route('admin.sessions.destroy', sessionToTerminate.id), {
            preserveScroll: true,
            onFinish: () => setSessionToTerminate(null),
        });
    };

    const confirmTerminateAll = () => {
        router.delete(route('admin.sessions.destroy-all'), {
            preserveScroll: true,
            onFinish: () => setShowTerminateAllDialog(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-semibold text-foreground">Session Monitoring</h2>
                            <Badge className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground hover:bg-primary">
                                {sessions.length}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">System-wide active session oversight.</p>
                        <p className="text-xs text-muted-foreground">Admin &#8250; Session Monitoring</p>
                    </div>

                    <Button
                        variant="outline"
                        className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setShowTerminateAllDialog(true)}
                    >
                        <ShieldOff className="h-4 w-4" />
                        Terminate All
                    </Button>
                </div>
            }
        >
            <Head title="Session Monitoring" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-lg border border-border bg-card p-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by user name or IP..."
                                className="bg-background lg:max-w-sm"
                            />
                            <p className="text-sm text-muted-foreground">{filteredSessions.length} active sessions</p>
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card">
                        <Table>
                            <TableHeader className="bg-muted [&_tr]:border-border">
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                        Session
                                    </TableHead>
                                    <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                        User
                                    </TableHead>
                                    <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                        IP Address
                                    </TableHead>
                                    <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                        Last Activity
                                    </TableHead>
                                    <TableHead className="bg-muted text-right text-xs uppercase tracking-wider text-muted-foreground">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSessions.length === 0 ? (
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableCell colSpan={5} className="h-40 text-center">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Monitor className="h-10 w-10" />
                                                <p>No active sessions found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSessions.map((session) => {
                                        const isCurrentSession = session.id === currentSessionId;
                                        const userName = session.user_name ?? 'Unknown User';
                                        const userEmail = session.user_email ?? 'Unavailable';

                                        return (
                                            <TableRow
                                                key={session.id}
                                                className={isCurrentSession ? 'border-l-2 border-l-primary bg-primary/5' : 'hover:bg-muted/50'}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Monitor className="h-4 w-4 text-muted-foreground" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-foreground">Web Session</p>
                                                            <p className="font-mono text-xs text-muted-foreground">
                                                                {session.id.slice(0, 8)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <GravatarAvatar 
                                                            name={userName} 
                                                            avatarUrl={session.user_avatar_url} 
                                                            size="sm" 
                                                        />
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-foreground">
                                                                {userName}
                                                            </p>
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {userEmail}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                                                        {session.ip_address || 'Unavailable'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span className={getActivityDotClass(session.last_activity)}>&#9679;</span>
                                                        <span>{formatLastActivity(session.last_activity)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {isCurrentSession ? (
                                                        <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                                            YOUR SESSION
                                                        </span>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={() => setSessionToTerminate(session)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                            Terminate
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            <Dialog open={sessionToTerminate !== null} onOpenChange={(open) => !open && setSessionToTerminate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminate Session</DialogTitle>
                        <DialogDescription>
                            This will immediately end this user's session. They will be logged out of their current device.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSessionToTerminate(null)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmTerminate}>
                            Confirm Termination
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showTerminateAllDialog} onOpenChange={setShowTerminateAllDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Terminate All Sessions</DialogTitle>
                        <DialogDescription>
                            This will immediately terminate ALL active sessions system-wide except your own. All users will be logged out.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowTerminateAllDialog(false)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmTerminateAll}>
                            Terminate All
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
