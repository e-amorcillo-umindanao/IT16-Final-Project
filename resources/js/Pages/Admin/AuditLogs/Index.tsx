import { AuditCategoryTabs } from '@/components/AuditCategoryTabs';
import { EventsChart } from '@/components/EventsChart';
import { RelativeTime } from '@/components/RelativeTime';
import UserAvatar from '@/components/UserAvatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { getAuditActionBadge } from '@/lib/auditActionBadge';
import { detectCluster } from '@/lib/detectCluster';
import { cn } from '@/lib/utils';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    Activity,
    CalendarIcon,
    ChevronDown,
    ChevronUp,
    Download,
    FileDown,
    ShieldCheck,
    ShieldAlert,
    SlidersHorizontal,
    Terminal,
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
    user_id: number | null;
    action: AuditAction;
    category: 'security' | 'audit';
    description: string;
    metadata: Record<string, any> | null;
    ip_address: string | null;
    created_at: string;
    auditable?: {
        original_name?: string | null;
    } | null;
    user?: {
        name: string;
        email: string;
        avatar_url: string | null;
    } | null;
}

interface AuditUserOption {
    id: number;
    label: string;
}

interface Props extends PageProps {
    logs: PaginatedResponse<AuditLogRow>;
    filters: {
        category?: string;
        action?: string;
        from_date?: string;
        to_date?: string;
        user_id?: string;
    };
    securityCount: number;
    auditCount: number;
    direction: 'asc' | 'desc';
    users: AuditUserOption[];
    selectedUser: string | null;
    hourlyChart: Array<{
        hour: string;
        security: number;
        audit: number;
    }>;
}

const FAILURE_ACTIONS = new Set([
    '2fa_failed',
    'login_failed',
    'recovery_code_failed',
    'account_locked',
]);

const CLUSTER_WINDOW_SECONDS = 60;
const CLUSTER_THRESHOLD = 3;

const ACTION_GROUPS = [
    {
        label: 'Authentication',
        options: [
            { value: 'login_success', label: 'Login success' },
            { value: 'login_failed', label: 'Login failed' },
            { value: 'login_blocked_inactive', label: 'Login blocked (inactive)' },
            { value: 'logout', label: 'Logout' },
            { value: 'account_locked', label: 'Account locked' },
            { value: '2fa_enabled', label: '2FA enabled' },
            { value: '2fa_disabled', label: '2FA disabled' },
            { value: '2fa_verified', label: '2FA verified' },
            { value: '2fa_failed', label: '2FA failed' },
            { value: '2fa_corrupt_reset', label: '2FA corrupt reset' },
            { value: 'recovery_code_used', label: 'Recovery code used' },
            { value: 'recovery_code_failed', label: 'Recovery code failed' },
            { value: 'recovery_codes_regenerated', label: 'Recovery codes regenerated' },
            { value: 'password_changed', label: 'Password changed' },
            { value: 'pwned_password_rejected', label: 'Pwned password rejected' },
        ],
    },
    {
        label: 'Documents',
        options: [
            { value: 'document_uploaded', label: 'Document uploaded' },
            { value: 'document_version_uploaded', label: 'Version uploaded' },
            { value: 'document_version_restored', label: 'Version restored' },
            { value: 'document_downloaded', label: 'Document downloaded' },
            { value: 'document_deleted', label: 'Document deleted' },
            { value: 'document_restored', label: 'Document restored' },
            { value: 'document_starred', label: 'Document starred' },
            { value: 'document_unstarred', label: 'Document unstarred' },
            { value: 'document_shared', label: 'Document shared' },
            { value: 'share_revoked', label: 'Share revoked' },
            { value: 'signed_url_generated', label: 'Signed URL generated' },
            { value: 'signed_url_accessed', label: 'Signed URL accessed' },
            { value: 'bulk_download', label: 'Bulk download' },
            { value: 'bulk_delete', label: 'Bulk delete' },
            { value: 'document_permanently_deleted', label: 'Document permanently deleted' },
            { value: 'trash_emptied', label: 'Trash emptied' },
            { value: 'auto_purged', label: 'Auto purged' },
        ],
    },
    {
        label: 'Security',
        options: [
            { value: 'document_scan_blocked', label: 'Document scan blocked' },
            { value: 'malware_detected', label: 'Malware detected' },
            { value: 'integrity_violation', label: 'Integrity violation' },
            { value: 'bot_detected', label: 'Bot detected' },
            { value: 'access_blocked_ip', label: 'Access blocked (IP)' },
            { value: 'ip_rule_added', label: 'IP rule added' },
            { value: 'ip_rule_removed', label: 'IP rule removed' },
            { value: 'audit_integrity_check', label: 'Audit integrity check' },
            { value: 'session_revoked', label: 'Session revoked' },
            { value: 'session_terminated', label: 'Session terminated' },
            { value: 'all_sessions_terminated', label: 'All sessions terminated' },
        ],
    },
    {
        label: 'Account',
        options: [
            { value: 'request', label: 'Request' },
            { value: 'profile_updated', label: 'Profile updated' },
            { value: 'data_export_requested', label: 'Data export requested' },
            { value: 'two_factor_deadline_set', label: '2FA deadline set' },
            { value: 'user_activated', label: 'User activated' },
            { value: 'user_deactivated', label: 'User deactivated' },
            { value: 'user_role_changed', label: 'Role changed' },
            { value: 'account_deletion_requested', label: 'Deletion requested' },
            { value: 'account_deletion_cancelled', label: 'Deletion cancelled' },
            { value: 'account_deletion_executed', label: 'Deletion executed' },
        ],
    },
] as const;

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

function AuditPagination({
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

export default function AdminAuditLogsIndex({
    logs,
    filters,
    securityCount,
    direction,
    users,
    hourlyChart,
}: Props) {
    const [localFilters, setLocalFilters] = useState<Props['filters']>({
        category: filters.category ?? 'all',
        action: filters.action ?? '',
        from_date: filters.from_date ?? '',
        to_date: filters.to_date ?? '',
        user_id: filters.user_id ?? '',
    });
    const [fromDate, setFromDate] = useState<Date | undefined>(parseDateValue(filters.from_date ?? ''));
    const [toDate, setToDate] = useState<Date | undefined>(parseDateValue(filters.to_date ?? ''));
    const [fromDateOpen, setFromDateOpen] = useState(false);
    const [toDateOpen, setToDateOpen] = useState(false);
    const category = localFilters.category ?? 'all';
    const title = category === 'security'
        ? 'Security Events'
        : category === 'audit'
          ? 'General Activity'
          : 'Global Activity Trail';
    const subtitle = category === 'security'
        ? 'Security incidents, authentication, and session controls'
        : category === 'audit'
          ? 'Document, sharing, and administration activity'
          : 'Combined system-wide security and activity history';

    const exportQuery = Object.fromEntries(
        Object.entries(localFilters).filter(([, value]) => value !== undefined && value !== '')
    );
    const activeQuery = {
        ...exportQuery,
        direction,
    };
    const hasActiveFilter = Boolean(
        (localFilters.category && localFilters.category !== 'all')
        || localFilters.action
        || localFilters.from_date
        || localFilters.to_date
        || localFilters.user_id
    );
    const exportLabel = hasActiveFilter ? 'Export filtered results' : 'Export all';
    const cluster = detectCluster(
        logs.data,
        FAILURE_ACTIONS,
        CLUSTER_WINDOW_SECONDS,
        CLUSTER_THRESHOLD,
    );

    const applyFilters = () => {
        router.get(route('admin.audit-logs'), activeQuery, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const reset = { category: 'all', action: '', from_date: '', to_date: '', user_id: '' };
        setLocalFilters(reset);
        setFromDate(undefined);
        setToDate(undefined);
        setFromDateOpen(false);
        setToDateOpen(false);
        router.get(route('admin.audit-logs'), { direction }, { preserveState: false });
    };

    const setCategory = (value: string) => {
        const nextFilters = {
            ...localFilters,
            category: value,
        };

        setLocalFilters(nextFilters);
        router.get(route('admin.audit-logs'), { ...nextFilters, direction }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const filterByUser = (userId: number) => {
        setLocalFilters((current) => ({
            ...current,
            user_id: String(userId),
        }));

        router.get(route('admin.audit-logs'), {
            user_id: userId,
            category: localFilters.category,
            action: localFilters.action,
            from_date: localFilters.from_date,
            to_date: localFilters.to_date,
            direction,
        }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const handleTimestampSort = () => {
        router.get(route('admin.audit-logs'), {
            direction: direction === 'desc' ? 'asc' : 'desc',
            category: filters.category,
            action: filters.action,
            from_date: filters.from_date,
            to_date: filters.to_date,
            user_id: filters.user_id,
        }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold leading-tight text-foreground">Global Audit Log</h2>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/admin">Admin</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Audit Logs</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Global Audit Log" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardContent className="pt-5">
                            <AuditCategoryTabs
                                value={category}
                                onChange={setCategory}
                                securityCount={securityCount}
                            />
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
                                        <SelectContent className="max-h-80 overflow-y-auto">
                                            <SelectItem value="all">All actions</SelectItem>
                                            {ACTION_GROUPS.map((group) => (
                                                <SelectGroup key={group.label}>
                                                    <SelectLabel>{group.label}</SelectLabel>
                                                    {group.options.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectGroup>
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

                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="user_id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        User
                                    </Label>
                                    <Select
                                        value={localFilters.user_id || 'all'}
                                        onValueChange={(value) => {
                                            setLocalFilters((current) => ({
                                                ...current,
                                                user_id: value === 'all' ? '' : value,
                                            }));
                                            router.get(route('admin.audit-logs'), {
                                                user_id: value === 'all' ? undefined : value,
                                                category: localFilters.category,
                                                action: localFilters.action,
                                                from_date: localFilters.from_date,
                                                to_date: localFilters.to_date,
                                                direction,
                                            }, {
                                                preserveScroll: true,
                                                preserveState: true,
                                            });
                                        }}
                                    >
                                        <SelectTrigger id="user_id" className="w-52 bg-background" aria-label="Filter by user">
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

                    {cluster.detected && (
                        <Alert variant="destructive">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>Rapid failure cluster detected</AlertTitle>
                            <AlertDescription>
                                {cluster.count} consecutive failures were recorded within{' '}
                                {cluster.windowSeconds} seconds
                                {cluster.ip ? ` from ${cluster.ip}` : ''}.
                                {' '}This may indicate a brute-force attempt. Review the entries below.
                            </AlertDescription>
                        </Alert>
                    )}

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">
                                Event activity - today by hour
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <EventsChart data={hourlyChart} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <div>
                                    <CardTitle className="font-semibold text-foreground">{title}</CardTitle>
                                    <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                                        {subtitle} · {logs.total} total entries
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <a href={route('admin.audit-logs.export', activeQuery)}>
                                        <Download className="h-4 w-4" />
                                        {exportLabel} (CSV)
                                    </a>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                    <a href={route('admin.audit-logs.export-pdf', activeQuery)} target="_blank" rel="noopener noreferrer">
                                        <FileDown className="h-4 w-4" />
                                        {exportLabel} (PDF)
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
                                            <TableHead>
                                                <button
                                                    type="button"
                                                    onClick={handleTimestampSort}
                                                    className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                                                >
                                                    Timestamp
                                                    {direction === 'asc' ? (
                                                        <ChevronUp className="h-3 w-3" />
                                                    ) : (
                                                        <ChevronDown className="h-3 w-3" />
                                                    )}
                                                </button>
                                            </TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Action</TableHead>
                                            <TableHead>Target / Details</TableHead>
                                            <TableHead>IP Address</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.data.map((log) => {
                                            const actionBadge = getAuditActionBadge(log.action);
                                            const ActionIcon = actionBadge.icon;
                                            const location = (log.metadata as Record<string, any> | null)?.location;
                                            const locationLabel = typeof location === 'string'
                                                ? location
                                                : location && typeof location === 'object'
                                                  ? [location.city, location.region, location.country].filter(Boolean).join(', ')
                                                  : null;

                                            return (
                                                <TableRow key={log.id} className="hover:bg-muted/50">
                                                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                        <RelativeTime
                                                            datetime={log.created_at}
                                                            formatted={format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <button
                                                            type="button"
                                                            onClick={() => log.user_id && filterByUser(log.user_id)}
                                                            disabled={!log.user_id}
                                                            className={cn(
                                                                'flex items-center gap-2.5 text-left',
                                                                log.user_id ? 'cursor-pointer hover:underline' : 'cursor-default',
                                                            )}
                                                            aria-label={log.user_id ? `Filter logs by ${log.user?.name}` : 'System event'}
                                                        >
                                                            {log.user ? (
                                                                <>
                                                                    <UserAvatar user={log.user} size="md" />
                                                                    <div>
                                                                        <div className="text-sm font-medium text-foreground">{log.user.name}</div>
                                                                        <div className="text-xs text-muted-foreground">{log.user.email}</div>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Avatar className="h-8 w-8">
                                                                        <AvatarFallback className="bg-muted text-muted-foreground">
                                                                            <Terminal className="h-3.5 w-3.5" />
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <div>
                                                                        <div className="text-sm font-medium italic text-foreground">System</div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {category === 'all' && (
                                                                <span
                                                                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                                                        log.category === 'security'
                                                                            ? 'bg-destructive/10 text-destructive'
                                                                            : 'bg-muted text-muted-foreground'
                                                                    }`}
                                                                >
                                                                    {log.category === 'security' ? 'Security' : 'Activity'}
                                                                </span>
                                                            )}
                                                            <Badge
                                                                variant="outline"
                                                                className={`gap-1 text-xs font-medium uppercase tracking-wide ${actionBadge.className}`}
                                                            >
                                                                <ActionIcon className="h-3 w-3" />
                                                                {actionBadge.label}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm text-foreground">{log.description}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="cursor-help rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                                                        {log.ip_address || '-'}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                {locationLabel && (
                                                                    <TooltipContent>
                                                                        <p>{locationLabel}</p>
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
                        {logs.last_page > 1 && <AuditPagination logs={logs} filters={filters} />}
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
