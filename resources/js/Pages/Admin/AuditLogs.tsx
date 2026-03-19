import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Filter, Globe, Monitor, Search, User, X } from 'lucide-react';
import { useState } from 'react';

interface AuditLog {
    id: number;
    action: string;
    auditable_type: string | null;
    auditable_id: number | null;
    metadata: any;
    ip_address: string;
    user_agent: string;
    created_at: string;
    user: {
        name: string;
        email: string;
    } | null;
}

interface Props {
    logs: {
        data: AuditLog[];
        links: any[];
    };
    actionTypes: string[];
    filters: {
        search_user: string;
        action: string;
        date_from: string;
        date_to: string;
        ip_address: string;
    };
}

export default function AdminAuditLogs({ logs, actionTypes, filters }: Props) {
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
    const [localFilters, setLocalFilters] = useState(filters);

    const handleFilter = () => {
        router.get(route('admin.audit-logs'), localFilters, { preserveState: true });
    };

    const clearFilters = () => {
        const cleared = { search_user: '', action: '', date_from: '', date_to: '', ip_address: '' };
        setLocalFilters(cleared);
        router.get(route('admin.audit-logs'), cleared);
    };

    const getActionBadge = (action: string) => {
        const variants: Record<string, string> = {
            'login': 'bg-[#0F1B2D] text-[#60A5FA] border-[#17304F]',
            'failed_login': 'bg-[#2D1010] text-[#F87171] border-[#5A2020]',
            'document_uploaded': 'bg-[#132B1A] text-[#4ADE80] border-[#1E3A24]',
            'document_deleted': 'bg-[#2A2010] text-primary border-[#3F2E11]',
            'user_status_changed': 'bg-[#2A2010] text-primary border-[#3F2E11]',
            'user_role_changed': 'bg-[#0F1B2D] text-[#60A5FA] border-[#17304F]',
            'admin_session_terminated': 'bg-[#2D1010] text-[#F87171] border-[#5A2020]',
        };

        return <Badge variant="outline" className={variants[action] || 'bg-secondary text-muted-foreground border-border'}>{action.replace('_', ' ')}</Badge>;
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-foreground">
                    System Audit Logs
                </h2>
            }
        >
            <Head title="System Audit Logs" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                <Filter className="h-4 w-4" /> Global Log Filter
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>User</Label>
                                    <Input placeholder="Name/Email" value={localFilters.search_user} onChange={e => setLocalFilters(f => ({ ...f, search_user: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Action</Label>
                                    <Select value={localFilters.action || 'all'} onValueChange={(val: string | null) => setLocalFilters(f => ({ ...f, action: val === 'all' || !val ? '' : val }))}>
                                        <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Every Action</SelectItem>
                                            {actionTypes.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>IP Address</Label>
                                    <Input placeholder="127.0.0.1" value={localFilters.ip_address} onChange={e => setLocalFilters(f => ({ ...f, ip_address: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>From</Label>
                                    <Input type="date" value={localFilters.date_from} onChange={e => setLocalFilters(f => ({ ...f, date_from: e.target.value }))} />
                                </div>
                                <div className="flex gap-2">
                                    <Button className="flex-1" onClick={handleFilter}><Search className="h-4 w-4 mr-2" /> Apply</Button>
                                    <Button variant="outline" size="icon" onClick={clearFilters}><X className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-0 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>IP / Device</TableHead>
                                        <TableHead>Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.data.map(log => (
                                        <>
                                            <TableRow key={log.id} className="cursor-pointer" onClick={() => setExpandedRows(e => ({ ...e, [log.id]: !e[log.id] }))}>
                                                <TableCell>{expandedRows[log.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{log.user?.name || 'System'}</span>
                                                        <span className="text-[10px] text-muted-foreground">{log.user?.email || 'N/A'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getActionBadge(log.action)}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-[10px] text-muted-foreground">
                                                        <span className="flex items-center gap-1 font-mono"><Globe className="h-3 w-3" /> {log.ip_address}</span>
                                                        <span className="flex items-center gap-1 truncate max-w-[150px]"><Monitor className="h-3 w-3" /> {log.user_agent}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">{format(new Date(log.created_at), 'MMM d, HH:mm:ss')}</TableCell>
                                            </TableRow>
                                            {expandedRows[log.id] && (
                                                <TableRow className="bg-muted/40">
                                                    <TableCell colSpan={5} className="border-t border-border p-4">
                                                        <pre className="overflow-x-auto rounded border border-border bg-card p-3 font-mono text-[10px] text-foreground">
                                                            {JSON.stringify(log.metadata, null, 2)}
                                                        </pre>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </>
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
