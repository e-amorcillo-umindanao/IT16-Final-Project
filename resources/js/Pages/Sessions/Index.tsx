import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { Info, LogOut, Monitor } from 'lucide-react';
import { useState } from 'react';

interface SessionRow {
    id: string;
    ip_address: string | null;
    last_activity: number;
    user_agent: string | null;
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

export default function SessionsIndex({ sessions, currentSessionId }: Props) {
    const [sessionToRevoke, setSessionToRevoke] = useState<SessionRow | null>(null);

    const confirmRevoke = () => {
        if (!sessionToRevoke) {
            return;
        }

        router.delete(route('sessions.destroy', sessionToRevoke.id), {
            preserveScroll: true,
            onFinish: () => setSessionToRevoke(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-semibold text-foreground">Active Sessions</h2>
                        <Badge className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground hover:bg-primary">
                            {sessions.length}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Manage your active login sessions.</p>
                    <p className="text-xs text-muted-foreground">Main {'›'} Sessions</p>
                </div>
            }
        >
            <Head title="Active Sessions" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Alert className="border-l-4 border-l-primary bg-card">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Your current session is marked. Revoking it will log you out immediately.
                        </AlertDescription>
                    </Alert>

                    <div className="rounded-lg border border-border bg-card">
                        <Table>
                            <TableHeader className="bg-muted [&_tr]:border-border">
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                        Session
                                    </TableHead>
                                    <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                        IP Address
                                    </TableHead>
                                    <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                        Last Activity
                                    </TableHead>
                                    <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                        Started
                                    </TableHead>
                                    <TableHead className="bg-muted text-right text-xs uppercase tracking-wider text-muted-foreground">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.length === 0 ? (
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableCell colSpan={5} className="h-40 text-center">
                                            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                <Monitor className="h-10 w-10" />
                                                <p>No active sessions found.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sessions.map((session) => {
                                        const isCurrentSession = session.id === currentSessionId;

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
                                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                                                        {session.ip_address || '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span className={getActivityDotClass(session.last_activity)}>●</span>
                                                        <span>{formatLastActivity(session.last_activity)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">—</TableCell>
                                                <TableCell className="text-right">
                                                    {isCurrentSession ? (
                                                        <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                                            CURRENT
                                                        </span>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                            onClick={() => setSessionToRevoke(session)}
                                                        >
                                                            <LogOut className="h-4 w-4" />
                                                            Revoke
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

            <Dialog open={sessionToRevoke !== null} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Revoke Session</DialogTitle>
                        <DialogDescription>
                            This will immediately end this session. The device will be logged out.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSessionToRevoke(null)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmRevoke}>
                            Confirm Revoke
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
