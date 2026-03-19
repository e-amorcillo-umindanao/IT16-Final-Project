import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { Monitor, Smartphone, Trash2 } from 'lucide-react';

interface Session {
    id: string;
    ip_address: string;
    user_agent: string;
    last_activity: number;
    is_current_session: boolean;
}

export default function Index({ sessions }: { sessions: Session[] }) {
    const { delete: destroy, processing } = useForm();

    const revokeSession = (id: string) => {
        if (confirm('Are you sure you want to revoke this session? You will be logged out on that device.')) {
            destroy(route('sessions.destroy', id));
        }
    };

    const getDeviceIcon = (userAgent: string) => {
        if (/mobile|android|iphone|ipad/i.test(userAgent)) {
            return <Smartphone className="mr-2 h-4 w-4 text-muted-foreground" />;
        }
        return <Monitor className="mr-2 h-4 w-4 text-muted-foreground" />;
    };

    const getBrowserName = (userAgent: string) => {
        if (/chrome|crios/i.test(userAgent)) return 'Chrome';
        if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
        if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) return 'Safari';
        if (/edg/i.test(userAgent)) return 'Edge';
        return 'Unknown Browser';
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-foreground">
                    Active Sessions
                </h2>
            }
        >
            <Head title="Active Sessions" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Browser Sessions</CardTitle>
                            <CardDescription>
                                Manage and log out your active sessions on other browsers and devices.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Device</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Last Active</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell>
                                                <div className="flex items-center font-medium">
                                                    {getDeviceIcon(session.user_agent)}
                                                    <span>{getBrowserName(session.user_agent)}</span>
                                                    {session.is_current_session && (
                                                        <Badge variant="outline" className="ml-2 border-[#1E3A24] bg-[#132B1A] text-[#4ADE80]">
                                                            This device
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                                                    {session.user_agent}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {session.ip_address}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(new Date(session.last_activity * 1000), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {!session.is_current_session && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-[#F87171] hover:bg-[rgba(179,58,58,0.1)] hover:text-[#F87171]"
                                                        onClick={() => revokeSession(session.id)}
                                                        disabled={processing}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-1" />
                                                        Revoke
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
