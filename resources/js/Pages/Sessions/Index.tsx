import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { Info, LogOut, Monitor } from 'lucide-react';

interface SessionRow {
    id: string;
    ip_address: string | null;
    last_activity: number;
    user_agent: string | null;
    location?: string | null;
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

function getActivityAge(unixTimestamp: number) {
    return Math.floor(Date.now() / 1000 - unixTimestamp) / 60;
}

export default function SessionsIndex({ sessions, currentSessionId }: Props) {
    const handleRevoke = (sessionId: string) => {
        router.delete(route('sessions.destroy', sessionId), {
            preserveScroll: true,
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
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={route('dashboard')}>Main</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Sessions</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Active Sessions" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Alert className="border-l-4 border-l-primary bg-primary/5">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-sm text-foreground">
                            Your current session is marked. Revoking it will log you out immediately.
                        </AlertDescription>
                    </Alert>

                    <Separator className="my-6" />

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <CardTitle className="font-semibold text-foreground">Active Sessions</CardTitle>
                                <Badge className="rounded-full bg-primary/15 px-2 text-xs text-primary">
                                    {sessions.length}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Session</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Last Activity</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                                                No active sessions found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sessions.map((session) => {
                                            const isCurrentSession = session.id === currentSessionId;

                                            return (
                                                <TableRow
                                                    key={session.id}
                                                    className={`hover:bg-muted/50 ${
                                                        isCurrentSession ? 'border-l-2 border-l-primary bg-primary/5' : ''
                                                    }`}
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="flex-shrink-0 rounded bg-muted p-1.5">
                                                                <Monitor className="h-4 w-4 text-muted-foreground" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-medium text-foreground">
                                                                        Web Session
                                                                    </span>
                                                                    {isCurrentSession && (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="border-primary/20 bg-primary/15 text-xs text-primary"
                                                                        >
                                                                            Current
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <span className="font-mono text-xs text-muted-foreground">
                                                                    #{session.id.slice(0, 8)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                                                        {session.ip_address ?? '-'}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                {session.location && (
                                                                    <TooltipContent>
                                                                        <p>{session.location}</p>
                                                                    </TooltipContent>
                                                                )}
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`h-2 w-2 flex-shrink-0 rounded-full ${
                                                                    getActivityAge(session.last_activity) < 5
                                                                        ? 'bg-green-500'
                                                                        : getActivityAge(session.last_activity) < 30
                                                                          ? 'bg-amber-500'
                                                                          : 'bg-muted-foreground'
                                                                }`}
                                                            />
                                                            <span className="text-sm text-muted-foreground">
                                                                {formatLastActivity(session.last_activity)}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {isCurrentSession ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="border-border text-xs text-muted-foreground"
                                                            >
                                                                Current
                                                            </Badge>
                                                        ) : (
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="gap-1.5 text-destructive hover:bg-destructive/10"
                                                                        aria-label={`Revoke session from ${session.ip_address ?? 'unknown IP address'}`}
                                                                    >
                                                                        <LogOut className="h-3.5 w-3.5" />
                                                                        Revoke
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Revoke Session?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            This will immediately end this session. The device will be logged out.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                            onClick={() => handleRevoke(session.id)}
                                                                        >
                                                                            Revoke
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
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
