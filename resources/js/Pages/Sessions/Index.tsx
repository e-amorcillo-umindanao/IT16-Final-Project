import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { parseUserAgent } from '@/lib/parseUserAgent';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { formatDistanceToNow, fromUnixTime } from 'date-fns';
import { Info, LogOut, MapPin, Monitor, Smartphone } from 'lucide-react';

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
    return formatDistanceToNow(fromUnixTime(unixTimestamp), { addSuffix: true }).replace(/^about /, '');
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
                <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                        Device Access
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                                Active Sessions
                            </h1>
                            <Badge className="rounded-full border border-[#efcdbf] bg-[#fff4ee] px-3 py-1 text-sm font-medium text-[#a64824] hover:bg-[#fff4ee]">
                                {sessions.length}
                            </Badge>
                        </div>
                        <p className="max-w-3xl text-sm text-stone-500">
                            Manage and revoke your active sessions across devices.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Active Sessions" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Alert className="rounded-[28px] border border-[#efc7b8] bg-[#fdf0ea] px-5 py-4 text-[#8a3b1f] shadow-sm">
                        <Info className="h-4 w-4 text-[#c65e38]" />
                        <div className="space-y-1">
                            <AlertTitle className="text-base font-semibold text-[#6d2c15]">
                                Session Security
                            </AlertTitle>
                            <AlertDescription className="text-sm leading-7 text-[#8c4d35]">
                                Revoking a session will immediately log out the associated device.
                                If you notice unrecognized activity, revoke the session and change your
                                password immediately.
                            </AlertDescription>
                        </div>
                    </Alert>

                    <Card className="overflow-hidden rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                        <CardContent className="p-0">
                            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(220px,0.9fr)_auto] border-b border-[#ead8cd] bg-[#fff8f4] px-6 py-5 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                <div>Device &amp; Session</div>
                                <div>Location &amp; IP</div>
                                <div className="text-right">Actions</div>
                            </div>

                            {sessions.length === 0 ? (
                                <div className="px-6 py-16 text-center text-sm text-stone-500">
                                    No active sessions found.
                                </div>
                            ) : (
                                <div>
                                    {sessions.map((session) => {
                                        const isCurrentSession = session.id === currentSessionId;
                                        const device = parseUserAgent(session.user_agent);

                                        return (
                                            <div
                                                key={session.id}
                                                className={cn(
                                                    'grid grid-cols-1 gap-5 border-b border-[#f0e1d8] px-6 py-6 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.9fr)_auto] md:items-center',
                                                    isCurrentSession ? 'bg-[#fffaf7]' : 'bg-white',
                                                )}
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#efcdbf] bg-[#fff4ee] text-[#8d4a2f]">
                                                        {device.isMobile ? (
                                                            <Smartphone className="h-5 w-5" />
                                                        ) : (
                                                            <Monitor className="h-5 w-5" />
                                                        )}
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-2xl font-semibold tracking-tight text-stone-950">
                                                                {device.os}
                                                            </p>
                                                            {isCurrentSession && (
                                                                <Badge className="rounded-full border border-[#efc7b8] bg-[#fff1eb] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#b24b23] hover:bg-[#fff1eb]">
                                                                    Current Session
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-lg text-stone-800">{device.browser}</p>
                                                        <p className="text-sm text-stone-500">
                                                            Last active: {formatLastActivity(session.last_activity)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <p className="text-2xl text-stone-950">
                                                        {session.ip_address ?? '-'}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-lg text-stone-700">
                                                        {session.location ? (
                                                            <>
                                                                <MapPin className="h-4 w-4 text-stone-400" />
                                                                <span>{session.location}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-stone-500">Unknown location</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-start md:justify-end">
                                                    {isCurrentSession ? (
                                                        <Button
                                                            variant="outline"
                                                            disabled
                                                            className="h-11 rounded-2xl border-[#efd8cf] bg-white px-6 text-base text-[#d2aaa0] disabled:opacity-100"
                                                        >
                                                            Current
                                                        </Button>
                                                    ) : (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    className="h-11 rounded-2xl border-destructive bg-white px-6 text-base text-destructive hover:bg-destructive/5"
                                                                    aria-label={`Revoke session from ${session.ip_address ?? 'unknown IP address'}`}
                                                                >
                                                                    Revoke
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Revoke session?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will immediately end this session. The associated device will be logged out.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        onClick={() => handleRevoke(session.id)}
                                                                    >
                                                                        <LogOut className="mr-2 h-4 w-4" />
                                                                        Revoke
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
