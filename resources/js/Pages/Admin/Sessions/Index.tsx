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
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import UserAvatar from '@/components/UserAvatar';
import { parseUserAgent } from '@/lib/parseUserAgent';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import {
    differenceInHours,
    format,
    formatDistanceToNow,
    fromUnixTime,
} from 'date-fns';
import {
    MapPin,
    Monitor,
    RefreshCw,
    Search,
    ShieldCheck,
    ShieldOff,
    Smartphone,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface SessionRow {
    id: string;
    user_id: number | null;
    ip_address: string | null;
    last_activity: number;
    user_agent: string | null;
    user_name: string | null;
    user_email: string | null;
    user_avatar_url: string | null;
    location?: string | null;
}

interface UserOption {
    id: number;
    label: string;
}

interface Props {
    sessions: SessionRow[];
    currentSessionId: string;
    users: UserOption[];
    selectedUser: string | null;
    terminableSessionsCount: number;
}

function getLastActivityState(unixTimestamp: number) {
    const lastActiveDate = fromUnixTime(unixTimestamp);
    const label = formatDistanceToNow(lastActiveDate, { addSuffix: true }).replace(/^about /, '');
    const hoursInactive = differenceInHours(new Date(), lastActiveDate);

    return {
        label,
        hoursInactive,
        isStale: hoursInactive >= 24,
    };
}

export default function AdminSessionsIndex({
    sessions,
    currentSessionId,
    users,
    selectedUser,
    terminableSessionsCount,
}: Props) {
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

    const enrichedSessions = useMemo(
        () => sessions.map((session) => ({
            ...session,
            device: parseUserAgent(session.user_agent),
        })),
        [sessions],
    );

    const filteredSessions = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) {
            return enrichedSessions;
        }

        return enrichedSessions.filter((session) => {
            const fields = [
                session.user_name,
                session.user_email,
                session.ip_address,
                session.location,
                session.device.browser,
                session.device.os,
                session.device.label,
            ];

            return fields.some((field) => (field ?? '').toLowerCase().includes(value));
        });
    }, [enrichedSessions, search]);

    const showIdleState = terminableSessionsCount === 0 && search.trim() === '' && !selectedUser;

    const handleRevoke = (sessionId: string) => {
        router.delete(route('admin.sessions.destroy', sessionId), {
            preserveScroll: true,
        });
    };

    const handleTerminateAll = () => {
        router.delete(route('admin.sessions.destroy-all'), {
            preserveScroll: true,
        });
    };

    const handleRefresh = () => {
        setRefreshing(true);

        router.reload({
            onFinish: () => {
                setRefreshing(false);
                setLastRefreshed(new Date());
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-semibold text-foreground">Session Monitoring</h2>
                        <Badge className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground hover:bg-primary">
                            {sessions.length}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">System-wide active session oversight.</p>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/admin">Admin</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Session Monitoring</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Session Monitoring" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:max-w-xs">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by user, IP, or device..."
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    aria-label="Search sessions by user, IP address, or device"
                                    className="pl-9"
                                />
                            </div>

                            <Select
                                value={selectedUser ?? 'all'}
                                onValueChange={(value) => {
                                    router.get(route('admin.sessions'), {
                                        user_id: value === 'all' ? undefined : value,
                                    }, {
                                        preserveScroll: true,
                                        preserveState: true,
                                    });
                                }}
                            >
                                <SelectTrigger className="w-full sm:w-72" aria-label="Filter sessions by user">
                                    <SelectValue placeholder="All users" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All users</SelectItem>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={String(user.id)}>
                                            {user.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                                Last refreshed {format(lastRefreshed, 'HH:mm:ss')}
                            </span>
                            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
                                <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
                                {refreshing ? 'Refreshing...' : 'Refresh'}
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                {filteredSessions.length} active session{filteredSessions.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <CardTitle className="font-semibold text-foreground">Active Sessions</CardTitle>
                                <Badge className="rounded-full bg-primary/15 px-2 text-xs text-primary">
                                    {sessions.length}
                                </Badge>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={terminableSessionsCount === 0}
                                        className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                                        aria-label="Terminate all sessions except your current session"
                                    >
                                        <ShieldOff className="h-4 w-4" />
                                        Terminate All
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Terminate all other sessions?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will terminate all sessions except yours. {terminableSessionsCount} other
                                            {' '}session{terminableSessionsCount !== 1 ? 's' : ''} will be ended immediately.
                                            {' '}Continue?
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={handleTerminateAll}
                                        >
                                            Terminate All
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardHeader>
                        <CardContent className="p-0">
                            {showIdleState ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                                    <ShieldCheck className="mb-4 h-10 w-10 opacity-20" />
                                    <p className="text-sm font-medium text-foreground">No other active sessions</p>
                                    <p className="mt-1 text-xs opacity-70">
                                        Only your current session is active.
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Session</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>IP Address</TableHead>
                                            <TableHead>Last Active</TableHead>
                                            <TableHead>Device</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSessions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                                                    No active sessions found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredSessions.map((session) => {
                                                const isCurrentSession = session.id === currentSessionId;
                                                const userName = session.user_name ?? 'Unknown User';
                                                const userEmail = session.user_email ?? 'Unavailable';
                                                const lastActivity = getLastActivityState(session.last_activity);

                                                return (
                                                    <TableRow
                                                        key={session.id}
                                                        className={cn(
                                                            'transition-colors',
                                                            isCurrentSession
                                                                ? 'border-l-2 border-l-primary bg-primary/5 hover:bg-primary/10'
                                                                : lastActivity.isStale
                                                                  ? 'bg-amber-500/5 hover:bg-amber-500/10'
                                                                  : 'hover:bg-muted/50',
                                                        )}
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
                                                                            <>
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="border-primary/20 bg-primary/15 text-xs text-primary"
                                                                                >
                                                                                    Current
                                                                                </Badge>
                                                                                <Badge
                                                                                    variant="outline"
                                                                                    className="border-primary/20 bg-primary/15 text-xs text-primary"
                                                                                >
                                                                                    Your Session
                                                                                </Badge>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    <span className="font-mono text-xs text-muted-foreground">
                                                                        #{session.id.slice(0, 8)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2.5">
                                                                <UserAvatar
                                                                    user={{
                                                                        name: userName,
                                                                        email: session.user_email,
                                                                        avatar_url: session.user_avatar_url,
                                                                    }}
                                                                    size="md"
                                                                />
                                                                <div>
                                                                    <div className="text-sm font-medium text-foreground">
                                                                        {userName}
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {userEmail}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <code className="text-xs font-mono text-foreground">
                                                                    {session.ip_address ?? '-'}
                                                                </code>
                                                                {session.location && (
                                                                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                                        <MapPin className="h-3 w-3" />
                                                                        {session.location}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <span
                                                                    className={cn(
                                                                        'text-sm',
                                                                        lastActivity.isStale
                                                                            ? 'text-amber-600 dark:text-amber-400'
                                                                            : 'text-foreground',
                                                                    )}
                                                                >
                                                                    {lastActivity.label}
                                                                </span>
                                                                {lastActivity.isStale && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        Inactive {lastActivity.hoursInactive}h
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {session.device.isMobile ? (
                                                                    <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                                ) : (
                                                                    <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                                )}
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm text-foreground">
                                                                        {session.device.browser}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {session.device.os}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {isCurrentSession ? (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-border text-xs text-muted-foreground"
                                                                >
                                                                    Your Session
                                                                </Badge>
                                                            ) : (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="gap-1.5 text-destructive hover:bg-destructive/10"
                                                                            aria-label={`Terminate session for ${userName}`}
                                                                        >
                                                                            <X className="h-3.5 w-3.5" />
                                                                            Terminate
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Terminate this session?</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Terminate this session for {userName}? They will be logged
                                                                                {' '}out immediately.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                                onClick={() => handleRevoke(session.id)}
                                                                            >
                                                                                Terminate
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
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
