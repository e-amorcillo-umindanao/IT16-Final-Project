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
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    Activity,
    CalendarIcon,
    Download,
    FileDown,
    Lock,
    LogIn,
    LogOut,
    ShieldAlert,
    ShieldCheck,
    Share2,
    SlidersHorizontal,
    Trash2,
    Upload,
} from 'lucide-react';
import { useState } from 'react';

type AuditAction =
    | 'login_success'
    | 'login_failed'
    | 'logout'
    | 'document_uploaded'
    | 'document_downloaded'
    | 'document_shared'
    | 'document_deleted'
    | '2fa_enabled'
    | 'two_factor_enabled'
    | 'account_locked'
    | 'integrity_violation'
    | 'profile_updated'
    | string;

interface AuditLogRow {
    id: number;
    action: AuditAction;
    metadata: Record<string, any> | null;
    ip_address: string | null;
    created_at: string;
    auditable?: {
        original_name?: string | null;
    } | null;
    user?: {
        name: string;
        email: string;
    } | null;
}

interface Props extends PageProps {
    logs: PaginatedResponse<AuditLogRow>;
    filters: {
        action?: string;
        from_date?: string;
        to_date?: string;
    };
}

const ACTION_OPTIONS = [
    { value: 'all', label: 'All Actions' },
    { value: 'login_success', label: 'Login' },
    { value: 'login_failed', label: 'Failed Login' },
    { value: 'document_uploaded', label: 'Upload' },
    { value: 'document_downloaded', label: 'Download' },
    { value: 'document_shared', label: 'Share' },
    { value: 'document_deleted', label: 'Delete' },
    { value: 'logout', label: 'Logout' },
    { value: '2fa_enabled', label: '2FA Enabled' },
    { value: 'account_locked', label: 'Account Locked' },
    { value: 'integrity_violation', label: 'Integrity Violation' },
];

function parseDateValue(value: string) {
    if (!value) {
        return undefined;
    }

    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function formatDateValue(date?: Date) {
    return date ? format(date, 'yyyy-MM-dd') : '';
}

function getActionBadge(action: AuditAction) {
    switch (action) {
        case 'login_success':
            return { icon: LogIn, label: 'LOGIN SUCCESS', className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20' };
        case 'login_failed':
            return { icon: LogIn, label: 'LOGIN FAILED', className: 'bg-destructive/15 text-destructive border-destructive/20' };
        case 'logout':
            return { icon: LogOut, label: 'LOGOUT', className: 'bg-muted text-muted-foreground border-border' };
        case 'document_uploaded':
            return { icon: Upload, label: 'UPLOADED', className: 'bg-primary/15 text-primary border-primary/20' };
        case 'document_downloaded':
            return { icon: Download, label: 'DOWNLOADED', className: 'bg-primary/15 text-primary border-primary/20' };
        case 'document_shared':
            return { icon: Share2, label: 'SHARED', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20' };
        case 'document_deleted':
            return { icon: Trash2, label: 'DELETED', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20' };
        case '2fa_enabled':
        case 'two_factor_enabled':
            return { icon: ShieldCheck, label: '2FA ENABLED', className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20' };
        case 'account_locked':
            return { icon: Lock, label: 'LOCKED', className: 'bg-destructive/15 text-destructive border-destructive/20' };
        case 'integrity_violation':
            return { icon: ShieldAlert, label: 'INTEGRITY VIOLATION', className: 'bg-destructive/15 text-destructive border-destructive/20' };
        default:
            return {
                icon: Activity,
                label: action.replace(/_/g, ' ').toUpperCase(),
                className: 'bg-muted text-muted-foreground border-border',
            };
    }
}

function getTargetDetails(action: string, metadata: Record<string, any> | null) {
    const documentName = metadata?.document_name ?? metadata?.original_name;
    const documentLabel = documentName ? `"${documentName}"` : 'a document';
    const location = metadata?.location as { city?: string; country?: string } | undefined;

    switch (action) {
        case 'login_success':
            return {
                primary: location?.city
                    ? `Signed in from ${[location.city, location.country].filter(Boolean).join(', ')}`
                    : 'Signed in successfully',
                secondary: metadata?.two_factor !== undefined ? `2FA: ${metadata.two_factor ? 'Enabled' : 'Disabled'}` : null,
            };
        case 'login_failed':
            return { primary: 'Failed login attempt', secondary: null };
        case 'document_uploaded':
            return {
                primary: `Uploaded ${documentLabel}`,
                secondary: null,
            };
        case 'document_downloaded':
            return {
                primary: `Downloaded ${documentLabel}`,
                secondary: metadata?.method === 'bulk_download' ? 'Included in bulk download' : null,
            };
        case 'document_shared':
            return {
                primary: metadata?.shared_with
                    ? `Shared ${documentLabel} with ${metadata.shared_with}`
                    : `Shared ${documentLabel}`,
                secondary: null,
            };
        case 'document_deleted':
            return {
                primary: `Moved ${documentLabel} to trash`,
                secondary: null,
            };
        case 'document_restored':
            return {
                primary: `Restored ${documentLabel}`,
                secondary: null,
            };
        case 'document_starred':
            return {
                primary: `Starred ${documentLabel}`,
                secondary: null,
            };
        case 'document_unstarred':
            return {
                primary: `Unstarred ${documentLabel}`,
                secondary: null,
            };
        case 'share_link_generated':
            return {
                primary: typeof metadata?.expires_hours === 'number'
                    ? `Generated share link for ${documentLabel} (${metadata.expires_hours}h)`
                    : `Generated share link for ${documentLabel}`,
                secondary: null,
            };
        case 'share_link_accessed':
            return {
                primary: `Share link accessed for ${documentLabel}`,
                secondary: null,
            };
        case 'share_revoked':
            return {
                primary: metadata?.revoked_from
                    ? `Revoked access to ${documentLabel} from ${metadata.revoked_from}`
                    : `Revoked access to ${documentLabel}`,
                secondary: null,
            };
        case 'account_locked':
            return { primary: 'Account locked after failed attempts', secondary: null };
        case 'integrity_violation':
            return {
                primary: `Integrity check failed for ${documentLabel}`,
                secondary: typeof metadata?.reason === 'string' ? metadata.reason : null,
            };
        case 'logout':
            return {
                primary: metadata?.ip_address ? `Signed out from ${metadata.ip_address}` : 'Signed out',
                secondary: null,
            };
        case '2fa_enabled':
        case 'two_factor_enabled':
            return { primary: 'Two-factor authentication enabled', secondary: null };
        case '2fa_disabled':
        case 'two_factor_disabled':
            return { primary: 'Two-factor authentication disabled', secondary: null };
        case 'password_changed':
            return { primary: 'Password updated', secondary: null };
        case 'profile_updated':
            return { primary: 'Profile information updated', secondary: null };
        case 'session_revoked':
        case 'session_terminated':
            return { primary: 'Active session revoked', secondary: null };
        case 'bulk_download':
            return {
                primary: typeof metadata?.document_count === 'number'
                    ? `Downloaded ${metadata.document_count} documents as ZIP`
                    : 'Bulk download performed',
                secondary: null,
            };
        case 'bulk_delete':
            return {
                primary: typeof metadata?.document_count === 'number'
                    ? `Moved ${metadata.document_count} documents to trash`
                    : 'Bulk delete performed',
                secondary: null,
            };
        default:
            return { primary: action.replace(/_/g, ' '), secondary: null };
    }
}

function ActivityPagination({
    logs,
    filters,
}: {
    logs: PaginatedResponse<AuditLogRow>;
    filters: Props['filters'];
}) {
    const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
    );

    return (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
                Showing {logs.from ?? 0}-{logs.to ?? 0} of {logs.total} logs
            </p>
            <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href={logs.prev_page_url ?? '#'}
                            className={!logs.prev_page_url ? 'pointer-events-none opacity-50' : ''}
                            onClick={(event) => {
                                event.preventDefault();
                                if (logs.prev_page_url) {
                                    router.get(logs.prev_page_url, cleanedFilters, {
                                        preserveScroll: true,
                                        preserveState: true,
                                    });
                                }
                            }}
                        />
                    </PaginationItem>
                    {logs.links.slice(1, -1).map((link, index) => (
                        <PaginationItem key={`${link.label}-${index}`}>
                            {link.label === '...' ? (
                                <PaginationEllipsis />
                            ) : (
                                <PaginationLink
                                    href={link.url ?? '#'}
                                    isActive={link.active}
                                    onClick={(event) => {
                                        event.preventDefault();
                                        if (link.url) {
                                            router.get(link.url, cleanedFilters, {
                                                preserveScroll: true,
                                                preserveState: true,
                                            });
                                        }
                                    }}
                                >
                                    {link.label}
                                </PaginationLink>
                            )}
                        </PaginationItem>
                    ))}
                    <PaginationItem>
                        <PaginationNext
                            href={logs.next_page_url ?? '#'}
                            className={!logs.next_page_url ? 'pointer-events-none opacity-50' : ''}
                            onClick={(event) => {
                                event.preventDefault();
                                if (logs.next_page_url) {
                                    router.get(logs.next_page_url, cleanedFilters, {
                                        preserveScroll: true,
                                        preserveState: true,
                                    });
                                }
                            }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}

export default function ActivityIndex({ logs, filters }: Props) {
    const [localFilters, setLocalFilters] = useState<Props['filters']>({
        action: filters.action ?? '',
        from_date: filters.from_date ?? '',
        to_date: filters.to_date ?? '',
    });
    const [fromDate, setFromDate] = useState<Date | undefined>(parseDateValue(filters.from_date ?? ''));
    const [toDate, setToDate] = useState<Date | undefined>(parseDateValue(filters.to_date ?? ''));
    const [fromDateOpen, setFromDateOpen] = useState(false);
    const [toDateOpen, setToDateOpen] = useState(false);

    const exportQuery = Object.fromEntries(
        Object.entries(localFilters).filter(([, value]) => value !== undefined && value !== '')
    );

    const applyFilters = () => {
        router.get(route('activity.index'), exportQuery, {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const reset = { action: '', from_date: '', to_date: '' };
        setLocalFilters(reset);
        setFromDate(undefined);
        setToDate(undefined);
        setFromDateOpen(false);
        setToDateOpen(false);
        router.get(route('activity.index'), {}, { preserveState: false });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold leading-tight text-foreground">Activity Log</h2>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/dashboard">Main</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Activity</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Activity Log" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardContent className="pt-5">
                            <div className="flex flex-wrap items-end gap-6">
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="action" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Action Type
                                    </Label>
                                    <Select
                                        value={localFilters.action || 'all'}
                                        onValueChange={(value) =>
                                            setLocalFilters((current) => ({
                                                ...current,
                                                action: value === 'all' ? '' : value,
                                            }))
                                        }
                                    >
                                        <SelectTrigger id="action" className="w-48 bg-background">
                                            <SelectValue placeholder="All Actions" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ACTION_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="from_date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        From Date
                                    </Label>
                                    <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="from_date"
                                                type="button"
                                                variant="outline"
                                                className={`w-44 justify-start text-left font-normal ${!fromDate ? 'text-muted-foreground' : ''}`}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                                {fromDate
                                                    ? format(fromDate, 'MMM d, yyyy')
                                                    : 'Start date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={fromDate}
                                                onSelect={(date) => {
                                                    setFromDate(date);
                                                    setLocalFilters((current) => ({
                                                        ...current,
                                                        from_date: formatDateValue(date),
                                                    }));
                                                    if (!date || (toDate && date > toDate)) {
                                                        setToDate(undefined);
                                                        setLocalFilters((current) => ({
                                                            ...current,
                                                            from_date: formatDateValue(date),
                                                            to_date: '',
                                                        }));
                                                    }
                                                    setFromDateOpen(false);
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="to_date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        To Date
                                    </Label>
                                    <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                id="to_date"
                                                type="button"
                                                variant="outline"
                                                className={`w-44 justify-start text-left font-normal ${!toDate ? 'text-muted-foreground' : ''}`}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                                {toDate
                                                    ? format(toDate, 'MMM d, yyyy')
                                                    : 'End date'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={toDate}
                                                onSelect={(date) => {
                                                    setToDate(date);
                                                    setLocalFilters((current) => ({
                                                        ...current,
                                                        to_date: formatDateValue(date),
                                                    }));
                                                    setToDateOpen(false);
                                                }}
                                                disabled={(date) => (fromDate ? date < fromDate : false)}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="flex items-end gap-2 pb-0">
                                    <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={applyFilters}>
                                        <SlidersHorizontal className="h-4 w-4" />
                                        Apply Filters
                                    </Button>
                                    <Button type="button" variant="ghost" className="text-muted-foreground" onClick={resetFilters}>
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <div>
                                    <CardTitle className="font-semibold text-foreground">Security Audit Trail</CardTitle>
                                    <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                                        {logs.total} total entries
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <a href={route('activity.export', exportQuery)}>
                                        <Download className="h-4 w-4" />
                                        Export CSV
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a href={route('activity.export-pdf', exportQuery)} target="_blank" rel="noopener noreferrer">
                                        <FileDown className="h-4 w-4" />
                                        Export PDF
                                    </a>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {logs.data.length === 0 ? (
                                <Card className="border-0 shadow-none">
                                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                        <Activity className="mb-3 h-10 w-10 text-muted-foreground" />
                                        <p className="font-medium text-foreground">No activity found</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Try adjusting your filters or date range.
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Timestamp</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Target / Details</TableHead>
                                            <TableHead>IP Address</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.data.map((log) => {
                                            const actionBadge = getActionBadge(log.action);
                                            const details = getTargetDetails(log.action, log.metadata);
                                            const ActionIcon = actionBadge.icon;
                                            const location = (log.metadata as Record<string, any> | null)?.location as
                                                | { city?: string; country?: string }
                                                | undefined;

                                            return (
                                                <TableRow key={log.id} className="hover:bg-muted/50">
                                                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                        <div>{format(new Date(log.created_at), 'MMM dd, yyyy')}</div>
                                                        <div>{format(new Date(log.created_at), 'HH:mm:ss')}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={`gap-1 text-xs font-semibold uppercase tracking-wide ${actionBadge.className}`}
                                                        >
                                                            <ActionIcon className="h-3 w-3" />
                                                            {actionBadge.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-foreground">{details.primary}</span>
                                                            {details.secondary && (
                                                                <span className="text-xs text-muted-foreground">{details.secondary}</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                                                        {log.ip_address || '—'}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                {location && (
                                                                    <TooltipContent>
                                                                        <p>{[location.city, location.country].filter(Boolean).join(', ')}</p>
                                                                    </TooltipContent>
                                                                )}
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                        {logs.last_page > 1 && <ActivityPagination logs={logs} filters={filters} />}
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
