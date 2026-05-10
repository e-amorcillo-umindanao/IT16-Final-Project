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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Head, router } from '@inertiajs/react';
import { differenceInHours, format, formatDistanceToNow, fromUnixTime } from 'date-fns';
import {
    Clock3,
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
        () =>
            sessions.map((session) => ({
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

    const currentSession = enrichedSessions.find((session) => session.id === currentSessionId) ?? null;
    const nonCurrentSessions = filteredSessions.filter((session) => session.id !== currentSessionId);
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
                <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                        Session Oversight
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                                Session Monitoring
                            </h1>
                            <Badge className="rounded-full border border-[#efcdbf] bg-[#fff4ee] px-3 py-1 text-sm font-medium text-[#a64824] hover:bg-[#fff4ee]">
                                {sessions.length}
                            </Badge>
                        </div>
                        <p className="max-w-3xl text-sm text-stone-500">
                            Review active authenticated sessions across the system, refresh the live view,
                            and terminate compromised sessions without leaving the console.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Session Monitoring" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Card className="rounded-[30px] border border-[#ead8cd] bg-[#fdf8f4] shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                                    <div className="relative w-full sm:max-w-xl">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                                        <Input
                                            placeholder="Search by user, IP, or device..."
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            aria-label="Search sessions by user, IP address, or device"
                                            className="h-12 rounded-2xl border-[#e8d7cc] bg-white pl-10 text-sm shadow-none focus-visible:ring-amber-200"
                                        />
                                    </div>

                                    <Select
                                        value={selectedUser ?? 'all'}
                                        onValueChange={(value) => {
                                            router.get(
                                                route('admin.sessions'),
                                                {
                                                    user_id: value === 'all' ? undefined : value,
                                                },
                                                {
                                                    preserveScroll: true,
                                                    preserveState: true,
                                                },
                                            );
                                        }}
                                    >
                                        <SelectTrigger
                                            className="h-12 w-full rounded-2xl border-[#e8d7cc] bg-white shadow-none sm:w-72"
                                            aria-label="Filter sessions by user"
                                        >
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
                                    <div className="flex items-center gap-2 text-sm text-stone-500">
                                        <Clock3 className="h-4 w-4" />
                                        Last refreshed: {format(lastRefreshed, 'HH:mm:ss')}
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-12 rounded-2xl border-[#d7c3b7] bg-[#f7e6df] px-4 text-stone-700 hover:bg-[#f1ddd5]"
                                        onClick={handleRefresh}
                                        disabled={refreshing}
                                    >
                                        <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                                        {refreshing ? 'Refreshing...' : 'Refresh'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between border-b border-[#ead8cd] bg-[#fff8f4] px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-semibold text-stone-950">Active Sessions</h2>
                                    <Badge className="rounded-full border border-[#efcdbf] bg-[#fff4ee] px-3 py-1 text-sm font-medium text-[#a64824] hover:bg-[#fff4ee]">
                                        {sessions.length}
                                    </Badge>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            disabled={terminableSessionsCount === 0}
                                            className="rounded-2xl px-0 text-destructive hover:bg-transparent hover:text-destructive/80 disabled:opacity-50"
                                            aria-label="Terminate all sessions except your current session"
                                        >
                                            Terminate All
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Terminate all other sessions?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will terminate all sessions except yours. {terminableSessionsCount} other
                                                {' '}session{terminableSessionsCount !== 1 ? 's' : ''} will be ended immediately.
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
                            </div>

                            {showIdleState ? (
                                <div className="space-y-0">
                                    <div className="border-b border-[#ead8cd] bg-[#fff8f4] px-6 py-4 text-sm text-stone-500">
                                        No other active sessions across the platform.
                                    </div>

                                    {currentSession && (
                                        <div className="px-6 py-5">
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar
                                                        user={{
                                                            name: currentSession.user_name ?? 'Current User',
                                                            email: currentSession.user_email,
                                                            avatar_url: currentSession.user_avatar_url,
                                                        }}
                                                        size="md"
                                                    />
                                                    <div>
                                                        <p className="text-lg font-medium text-stone-950">
                                                            Current Session (This device)
                                                        </p>
                                                        <p className="text-sm text-stone-500">
                                                            {currentSession.device.os} - {currentSession.device.browser} -{' '}
                                                            {currentSession.ip_address ?? 'Unknown IP'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-emerald-700">
                                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                                    <span className="text-sm font-medium">Active</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-white [&_tr]:border-[#ead8cd]">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="py-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Session</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">User</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">IP Address</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Last Active</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Device</TableHead>
                                            <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredSessions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="py-16 text-center text-sm text-stone-500">
                                                    No active sessions found for the current search.
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
                                                            'border-[#f0e1d8] transition-colors hover:bg-[#fffaf7]',
                                                            isCurrentSession ? 'bg-[#fff8f4]' : '',
                                                        )}
                                                    >
                                                        <TableCell className="py-5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f6eee8]">
                                                                    <Monitor className="h-4 w-4 text-stone-500" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium text-stone-950">
                                                                            Web Session
                                                                        </span>
                                                                        {isCurrentSession && (
                                                                            <Badge className="rounded-full border border-[#efcdbf] bg-[#fff4ee] px-2.5 py-0.5 text-xs font-medium text-[#a64824] hover:bg-[#fff4ee]">
                                                                                Current
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <span className="font-mono text-xs text-stone-500">
                                                                        #{session.id.slice(0, 8)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <UserAvatar
                                                                    user={{
                                                                        name: userName,
                                                                        email: session.user_email,
                                                                        avatar_url: session.user_avatar_url,
                                                                    }}
                                                                    size="md"
                                                                />
                                                                <div>
                                                                    <div className="text-sm font-medium text-stone-950">
                                                                        {userName}
                                                                    </div>
                                                                    <div className="text-xs text-stone-500">{userEmail}</div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex flex-col">
                                                                <code className="text-xs font-mono text-stone-800">
                                                                    {session.ip_address ?? '-'}
                                                                </code>
                                                                {session.location && (
                                                                    <span className="mt-1 flex items-center gap-1 text-xs text-stone-500">
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
                                                                        lastActivity.isStale ? 'text-amber-600' : 'text-stone-800',
                                                                    )}
                                                                >
                                                                    {lastActivity.label}
                                                                </span>
                                                                {lastActivity.isStale && (
                                                                    <span className="text-xs text-stone-500">
                                                                        Inactive {lastActivity.hoursInactive}h
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                {session.device.isMobile ? (
                                                                    <Smartphone className="h-4 w-4 shrink-0 text-stone-500" />
                                                                ) : (
                                                                    <Monitor className="h-4 w-4 shrink-0 text-stone-500" />
                                                                )}
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm text-stone-900">
                                                                        {session.device.browser}
                                                                    </span>
                                                                    <span className="text-xs text-stone-500">
                                                                        {session.device.os}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {isCurrentSession ? (
                                                                <div className="flex items-center justify-end gap-2 text-emerald-700">
                                                                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                                                    <span className="text-sm font-medium">Active</span>
                                                                </div>
                                                            ) : (
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="rounded-xl text-destructive hover:bg-destructive/10"
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
                                                                                Terminate this session for {userName}? They will be logged out immediately.
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
