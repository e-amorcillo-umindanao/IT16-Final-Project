import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Clock, Filter, Globe, Monitor, Search, X } from 'lucide-react';
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
    hash: string;
    previous_hash: string | null;
    auditable?: {
        original_name?: string;
    };
}

interface Props {
    logs: {
        data: AuditLog[];
        links: any[];
    };
    filters: {
        action: string;
        date_from: string;
        date_to: string;
    };
    actionTypes: string[];
}

export default function ActivityIndex({ logs, filters, actionTypes }: Props) {
    const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
    const [localFilters, setLocalFilters] = useState(filters);

    const toggleRow = (id: number) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleFilter = () => {
        router.get(route('activity.index'), localFilters, {
            preserveState: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        const cleared = { action: '', date_from: '', date_to: '' };
        setLocalFilters(cleared);
        router.get(route('activity.index'), cleared);
    };

    const getActionBadge = (action: string) => {
        const variants: Record<string, string> = {
            'login': 'bg-blue-100 text-blue-700 border-blue-200',
            'logout': 'bg-gray-100 text-gray-700 border-gray-200',
            'document_uploaded': 'bg-green-100 text-green-700 border-green-200',
            'document_downloaded': 'bg-indigo-100 text-indigo-700 border-indigo-200',
            'document_deleted': 'bg-amber-100 text-amber-700 border-amber-200',
            'document_shared': 'bg-purple-100 text-purple-700 border-purple-200',
            'share_revoked': 'bg-rose-100 text-rose-700 border-rose-200',
            'failed_login': 'bg-red-100 text-red-700 border-red-200',
            'integrity_violation': 'bg-black text-white border-gray-800',
        };

        return (
            <Badge variant="outline" className={variants[action] || 'bg-gray-50 text-gray-600'}>
                {action.replace('_', ' ')}
            </Badge>
        );
    };

    const parseUserAgent = (ua: string) => {
        if (!ua) return 'Unknown Device';
        const browser = ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : ua.includes('Safari') ? 'Safari' : 'Browser';
        const os = ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'OS';
        return `${browser} on ${os}`;
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Activity Logs
                </h2>
            }
        >
            <Head title="Activity Logs" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    {/* Filters */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium flex items-center gap-2 text-gray-500 uppercase tracking-wider">
                                <Filter className="h-4 w-4" /> Filter Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>Action Type</Label>
                                    <Select 
                                        value={localFilters.action || 'all'} 
                                        onValueChange={(val: string | null) => setLocalFilters(f => ({ ...f, action: val === 'all' || !val ? '' : val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="All Actions" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Every Action</SelectItem>
                                            {actionTypes.map(type => (
                                                <SelectItem key={type} value={type}>
                                                    {type.replace('_', ' ')}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>From Date</Label>
                                    <Input 
                                        type="date" 
                                        value={localFilters.date_from} 
                                        onChange={e => setLocalFilters(f => ({ ...f, date_from: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>To Date</Label>
                                    <Input 
                                        type="date" 
                                        value={localFilters.date_to} 
                                        onChange={e => setLocalFilters(f => ({ ...f, date_to: e.target.value }))}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleFilter}>
                                        <Search className="mr-2 h-4 w-4" /> Apply
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={clearFilters} title="Clear Filters">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Logs Table */}
                    <Card>
                        <CardContent className="p-0 overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10"></TableHead>
                                        <TableHead>Timestamp</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Target/Details</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Device</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-64 text-center text-gray-500">
                                                No activity logs found for the selected criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.data.map((log) => (
                                            <>
                                                <TableRow 
                                                    key={log.id} 
                                                    className="cursor-pointer hover:bg-gray-50/50"
                                                    onClick={() => toggleRow(log.id)}
                                                >
                                                    <TableCell>
                                                        {expandedRows[log.id] ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-medium">
                                                        <div className="flex flex-col">
                                                            <span>{format(new Date(log.created_at), 'MMM d, yyyy')}</span>
                                                            <span className="text-xs text-gray-400 font-normal">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getActionBadge(log.action)}
                                                    </TableCell>
                                                    <TableCell className="text-sm max-w-[200px] truncate">
                                                        {log.auditable?.original_name || log.metadata?.original_name || log.metadata?.shared_with || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <Globe className="h-3 w-3" />
                                                            {log.ip_address}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <Monitor className="h-3 w-3" />
                                                            {parseUserAgent(log.user_agent)}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {expandedRows[log.id] && (
                                                    <TableRow className="bg-gray-50/50">
                                                        <TableCell colSpan={6} className="p-4 border-t">
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Detailed Metadata</p>
                                                                <pre className="text-[10px] font-mono bg-white border rounded p-3 overflow-x-auto">
                                                                    {JSON.stringify(log.metadata, null, 2)}
                                                                </pre>
                                                                <div className="flex gap-4 pt-2">
                                                                    <div className="text-[10px] text-gray-400">
                                                                        <span className="font-semibold uppercase tracking-tight">Record Hash:</span> {log.hash.substring(0, 16)}...
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-400">
                                                                        <span className="font-semibold uppercase tracking-tight">Chain Verification:</span> {log.previous_hash ? 'Linked' : 'Genesis'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Pagination */}
                    {logs.links && logs.links.length > 3 && (
                        <div className="flex items-center justify-center gap-2">
                            {logs.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`px-3 py-1 rounded border text-sm ${
                                        link.active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50'
                                    } ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
