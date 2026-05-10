import { AuditCategoryTabs } from '@/components/AuditCategoryTabs';
import { EventsChart } from '@/components/EventsChart';
import { RelativeTime } from '@/components/RelativeTime';
import UserAvatar from '@/components/UserAvatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
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
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    Activity,
    CalendarIcon,
    ChevronDown,
    ChevronUp,
    Download,
    FileDown,
    ShieldAlert,
    Terminal,
    X,
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
            { value: 'google_oauth_login', label: 'Google OAuth login' },
            { value: 'google_oauth_login_failed', label: 'Google OAuth login failed' },
            { value: 'google_oauth_linked', label: 'Google OAuth linked' },
            { value: 'google_oauth_unlinked', label: 'Google OAuth unlinked' },
            { value: 'google_oauth_link_failed', label: 'Google OAuth link failed' },
            { value: 'google_oauth_denied', label: 'Google OAuth denied' },
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
            { value: 'email_verified', label: 'Email verified' },
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

function ActiveFilterChip({
    label,
    onClear,
}: {
    label: string;
    onClear: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-full border border-[#efc7b8] bg-[#fff4ee] px-3 py-1.5 text-sm text-[#a64824] transition-colors hover:bg-[#fdebe4]"
        >
            <span>{label}</span>
            <X className="h-3.5 w-3.5" />
        </button>
    );
}

function AuditPagination({
    logs,
    filters,
}: {
    logs: PaginatedResponse<AuditLogRow>;
    filters: Props['filters'];
}) {
    const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
    );

    return (
        <div className="flex flex-col gap-3 border-t border-[#ead8cd] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">
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
    auditCount,
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
    const title =
        category === 'security'
            ? 'Security Events'
            : category === 'audit'
              ? 'General Activity'
              : 'Global Activity Trail';
    const subtitle =
        category === 'security'
            ? 'Security incidents, authentication, and session controls'
            : category === 'audit'
              ? 'Document, sharing, and administration activity'
              : 'Combined system-wide security and activity history';

    const exportQuery = Object.fromEntries(
        Object.entries(localFilters).filter(([, value]) => value !== undefined && value !== ''),
    );
    const activeQuery = {
        ...exportQuery,
        direction,
    };
    const hasActiveFilter = Boolean(
        (localFilters.category && localFilters.category !== 'all') ||
            localFilters.action ||
            localFilters.from_date ||
            localFilters.to_date ||
            localFilters.user_id,
    );
    const cluster = detectCluster(
        logs.data,
        FAILURE_ACTIONS,
        CLUSTER_WINDOW_SECONDS,
        CLUSTER_THRESHOLD,
    );
    const todaySecurityEvents = hourlyChart.reduce((sum, item) => sum + item.security, 0);
    const todayGeneralActivity = hourlyChart.reduce((sum, item) => sum + item.audit, 0);
    const peakHour = hourlyChart.reduce(
        (peak, item) => {
            const total = item.security + item.audit;

            if (total > peak.total) {
                return {
                    hour: item.hour,
                    total,
                };
            }

            return peak;
        },
        {
            hour: hourlyChart[0]?.hour ?? '00:00',
            total: (hourlyChart[0]?.security ?? 0) + (hourlyChart[0]?.audit ?? 0),
        },
    );
    const selectedUserLabel = users.find((user) => String(user.id) === localFilters.user_id)?.label ?? null;
    const activeFilterCount = [
        localFilters.category && localFilters.category !== 'all',
        Boolean(localFilters.action),
        Boolean(localFilters.from_date),
        Boolean(localFilters.to_date),
        Boolean(localFilters.user_id),
    ].filter(Boolean).length;

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

        router.get(
            route('admin.audit-logs'),
            {
                user_id: userId,
                category: localFilters.category,
                action: localFilters.action,
                from_date: localFilters.from_date,
                to_date: localFilters.to_date,
                direction,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const handleTimestampSort = () => {
        router.get(
            route('admin.audit-logs'),
            {
                direction: direction === 'desc' ? 'asc' : 'desc',
                category: filters.category,
                action: filters.action,
                from_date: filters.from_date,
                to_date: filters.to_date,
                user_id: filters.user_id,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                        Security Intelligence
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                            Audit Log
                        </h1>
                        <p className="max-w-3xl text-sm text-stone-500">
                            Review system-wide security and activity events, inspect suspicious clusters,
                            and export the audit trail for reporting or investigation.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Global Audit Log" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-[24px] border border-[#ecd8ce] bg-[#fdf8f4] p-5 shadow-sm">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="space-y-2">
                                <Badge className="rounded-full border-transparent bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-700 hover:bg-amber-500/15 dark:text-amber-400">
                                    Audit review
                                </Badge>
                                <div className="space-y-1.5">
                                    <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                                        Audit overview
                                    </h2>
                                    <p className="max-w-2xl text-sm leading-6 text-stone-500">
                                        Review system-wide security and activity events, then export the current view
                                        when you need evidence for reporting or defense prep.
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <Button
                                    variant="outline"
                                    className="h-11 rounded-2xl border-[#d7c3b7] bg-white px-4 text-stone-700"
                                    asChild
                                >
                                    <a href={route('admin.audit-logs.export', activeQuery)}>
                                        <Download className="h-4 w-4" />
                                        Export CSV
                                    </a>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-11 rounded-2xl border-[#d7c3b7] bg-white px-4 text-stone-700"
                                    asChild
                                >
                                    <a
                                        href={route('admin.audit-logs.export-pdf', activeQuery)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <FileDown className="h-4 w-4" />
                                        Export PDF
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
                        <div className="space-y-6">
                            <Card className="rounded-[24px] border border-[#ead8cd] bg-white/95 shadow-sm">
                                <CardContent className="space-y-5 p-5">
                                    <div className="space-y-1.5">
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                                            Filters
                                        </p>
                                        <h3 className="text-xl font-semibold text-stone-950">Refine the trail</h3>
                                        <p className="text-sm leading-6 text-stone-500">
                                            Narrow the log by category, action, date, or user.
                                        </p>
                                    </div>

                                    <AuditCategoryTabs
                                        value={category}
                                        onChange={setCategory}
                                        securityCount={securityCount}
                                    />

                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1.5">
                                            <Label
                                                htmlFor="action"
                                                className="text-xs font-semibold uppercase tracking-wider text-stone-500"
                                            >
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
                                                <SelectTrigger
                                                    id="action"
                                                    className="w-full rounded-2xl border-[#e8d7cc] bg-white shadow-none"
                                                >
                                                    <SelectValue placeholder="All actions" />
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
                                            <Label
                                                htmlFor="from_date"
                                                className="text-xs font-semibold uppercase tracking-wider text-stone-500"
                                            >
                                                From Date
                                            </Label>
                                            <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        id="from_date"
                                                        type="button"
                                                        variant="outline"
                                                        className={cn(
                                                            'w-full justify-start rounded-2xl border-[#e8d7cc] bg-white text-left font-normal shadow-none',
                                                            !fromDate && 'text-stone-500',
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                                        {fromDate ? format(fromDate, 'MMM d, yyyy') : 'Start date'}
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
                                                            setFromDateOpen(false);
                                                        }}
                                                        disabled={(date) => (toDate ? date > toDate : false)}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <Label
                                                htmlFor="to_date"
                                                className="text-xs font-semibold uppercase tracking-wider text-stone-500"
                                            >
                                                To Date
                                            </Label>
                                            <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        id="to_date"
                                                        type="button"
                                                        variant="outline"
                                                        className={cn(
                                                            'w-full justify-start rounded-2xl border-[#e8d7cc] bg-white text-left font-normal shadow-none',
                                                            !toDate && 'text-stone-500',
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                                        {toDate ? format(toDate, 'MMM d, yyyy') : 'End date'}
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
                                            <Label
                                                htmlFor="user_id"
                                                className="text-xs font-semibold uppercase tracking-wider text-stone-500"
                                            >
                                                User
                                            </Label>
                                            <Select
                                                value={localFilters.user_id || 'all'}
                                                onValueChange={(value) =>
                                                    setLocalFilters((current) => ({
                                                        ...current,
                                                        user_id: value === 'all' ? '' : value,
                                                    }))
                                                }
                                            >
                                                <SelectTrigger
                                                    id="user_id"
                                                    className="w-full rounded-2xl border-[#e8d7cc] bg-white shadow-none"
                                                >
                                                    <SelectValue placeholder="All users" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-80 overflow-y-auto">
                                                    <SelectItem value="all">All users</SelectItem>
                                                    {users.map((user) => (
                                                        <SelectItem key={user.id} value={String(user.id)}>
                                                            {user.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <Button
                                            type="button"
                                            onClick={applyFilters}
                                            className="h-11 rounded-2xl bg-[#b85b25] px-6 text-white hover:bg-[#a84f1f]"
                                        >
                                            Apply Filters
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="h-11 rounded-2xl text-stone-500 hover:bg-[#f7ede7] hover:text-stone-800"
                                            onClick={resetFilters}
                                        >
                                            Clear All
                                        </Button>
                                    </div>

                                    <div className="rounded-[20px] border border-[#f0e1d8] bg-[#fff8f4] p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Snapshot
                                        </p>
                                        <div className="mt-3 grid gap-3">
                                            <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                                                <span className="text-sm text-stone-500">Security</span>
                                                <span className="text-sm font-semibold text-stone-950">{securityCount}</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                                                <span className="text-sm text-stone-500">Activity</span>
                                                <span className="text-sm font-semibold text-stone-950">{auditCount}</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
                                                <span className="text-sm text-stone-500">Filters</span>
                                                <span className="text-sm font-semibold text-stone-950">
                                                    {hasActiveFilter ? activeFilterCount : 0}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-sm text-stone-500">
                                            {selectedUserLabel ? `Focused on ${selectedUserLabel}` : 'All users included'}
                                        </p>
                                    </div>

                                    {hasActiveFilter && (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {localFilters.from_date && localFilters.to_date && (
                                                <ActiveFilterChip
                                                    label={`Date range: ${localFilters.from_date} to ${localFilters.to_date}`}
                                                    onClear={() => {
                                                        setFromDate(undefined);
                                                        setToDate(undefined);
                                                        setLocalFilters((current) => ({
                                                            ...current,
                                                            from_date: '',
                                                            to_date: '',
                                                        }));
                                                    }}
                                                />
                                            )}
                                            {localFilters.action && (
                                                <ActiveFilterChip
                                                    label={`Action: ${localFilters.action}`}
                                                    onClear={() =>
                                                        setLocalFilters((current) => ({
                                                            ...current,
                                                            action: '',
                                                        }))
                                                    }
                                                />
                                            )}
                                            {localFilters.user_id && (
                                                <ActiveFilterChip
                                                    label="User filter active"
                                                    onClear={() =>
                                                        setLocalFilters((current) => ({
                                                            ...current,
                                                            user_id: '',
                                                        }))
                                                    }
                                                />
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {cluster.detected && (
                                <Alert className="rounded-[28px] border border-[#f1bdb2] bg-[#fff1ec] px-5 py-4 text-[#a93b1e] shadow-sm">
                                    <ShieldAlert className="h-4 w-4 text-[#d14b26]" />
                                    <AlertTitle className="text-base font-semibold text-[#962f17]">
                                        Rapid failure cluster detected
                                    </AlertTitle>
                                    <AlertDescription className="mt-1 text-sm leading-7 text-[#a24a33]">
                                        {cluster.count} consecutive failures were recorded within {cluster.windowSeconds} seconds
                                        {cluster.ip ? ` from ${cluster.ip}` : ''}. This may indicate a brute-force attempt.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>

                        <div className="space-y-6">
                            <Card className="rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                                <CardContent className="space-y-5 p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                                                Activity
                                            </p>
                                            <h3 className="text-2xl font-semibold tracking-tight text-stone-950">
                                                Event Activity
                                            </h3>
                                            <p className="max-w-2xl text-sm leading-6 text-stone-500">
                                                Today&apos;s event distribution across security and general activity.
                                            </p>
                                        </div>
                                        <div className="whitespace-nowrap rounded-full border border-[#ead8cd] bg-[#fffaf7] px-4 py-2 text-sm text-stone-600">
                                            {hasActiveFilter ? 'Filtered investigation view' : 'Complete log view'}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="rounded-[20px] border border-[#f0e1d8] bg-[#fff8f4] p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                Security Events Today
                                            </p>
                                            <p className="mt-3 text-3xl font-semibold text-stone-950">{todaySecurityEvents}</p>
                                            <p className="mt-1 text-sm text-stone-500">Authentication, threats, and control events</p>
                                        </div>
                                        <div className="rounded-[20px] border border-[#f0e1d8] bg-[#fff8f4] p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                General Activity Today
                                            </p>
                                            <p className="mt-3 text-3xl font-semibold text-stone-950">{todayGeneralActivity}</p>
                                            <p className="mt-1 text-sm text-stone-500">Uploads, shares, and account actions</p>
                                        </div>
                                        <div className="rounded-[20px] border border-[#f0e1d8] bg-[#fff8f4] p-4">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                Peak Hour Today
                                            </p>
                                            <p className="mt-3 text-3xl font-semibold text-stone-950">{peakHour.hour}</p>
                                            <p className="mt-1 text-sm text-stone-500">
                                                {peakHour.total} event{peakHour.total === 1 ? '' : 's'} in the busiest hour
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-[20px] border border-[#f0e1d8] bg-[#fffdfa] p-4">
                                        <EventsChart data={hourlyChart} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="overflow-hidden rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                                <CardContent className="p-0">
                                    <div className="flex flex-col gap-4 border-b border-[#ead8cd] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-semibold text-stone-950">{title}</h3>
                                            <p className="text-sm text-stone-500">
                                                {subtitle} - {logs.total} total entries
                                            </p>
                                        </div>
                                        <div className="rounded-full border border-[#ead8cd] bg-[#fffaf7] px-4 py-2 text-sm text-stone-600">
                                            {hasActiveFilter ? 'Filtered view' : 'Complete log view'}
                                        </div>
                                    </div>

                                    {logs.data.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                                            <Activity className="mb-4 h-10 w-10 text-stone-300" />
                                            <p className="text-lg font-semibold text-stone-900">No activity found</p>
                                            <p className="mt-2 max-w-md text-sm text-stone-500">
                                                Try adjusting your category, action, or date filters to surface matching log entries.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="min-w-[980px]">
                                            <Table>
                                                <TableHeader className="bg-[#fff8f4] [&_tr]:border-[#ead8cd]">
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableHead className="py-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                            <button
                                                                type="button"
                                                                onClick={handleTimestampSort}
                                                                className="flex items-center gap-1 transition-colors hover:text-stone-900"
                                                            >
                                                                Timestamp
                                                                {direction === 'asc' ? (
                                                                    <ChevronUp className="h-3 w-3" />
                                                                ) : (
                                                                    <ChevronDown className="h-3 w-3" />
                                                                )}
                                                            </button>
                                                        </TableHead>
                                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                            User
                                                        </TableHead>
                                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                            Action
                                                        </TableHead>
                                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                            Target / Details
                                                        </TableHead>
                                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                                            IP Address
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {logs.data.map((log) => {
                                                        const actionBadge = getAuditActionBadge(log.action);
                                                        const ActionIcon = actionBadge.icon;
                                                        const location = (log.metadata as Record<string, any> | null)?.location;
                                                        const locationLabel =
                                                            typeof location === 'string'
                                                                ? location
                                                                : location && typeof location === 'object'
                                                                  ? [location.city, location.region, location.country]
                                                                        .filter(Boolean)
                                                                        .join(', ')
                                                                  : null;

                                                        return (
                                                            <TableRow
                                                                key={log.id}
                                                                className={cn(
                                                                    'border-[#f0e1d8] hover:bg-[#fffaf7]',
                                                                    FAILURE_ACTIONS.has(log.action)
                                                                        ? 'bg-[#fff9f7]'
                                                                        : '',
                                                                )}
                                                            >
                                                                <TableCell className="whitespace-nowrap py-5 text-sm text-stone-600">
                                                                    <RelativeTime
                                                                        datetime={log.created_at}
                                                                        formatted={format(
                                                                            new Date(log.created_at),
                                                                            'MMM dd, yyyy HH:mm:ss',
                                                                        )}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => log.user_id && filterByUser(log.user_id)}
                                                                        disabled={!log.user_id}
                                                                        className={cn(
                                                                            'flex items-center gap-3 text-left',
                                                                            log.user_id ? 'cursor-pointer hover:underline' : 'cursor-default',
                                                                        )}
                                                                        aria-label={log.user_id ? `Filter logs by ${log.user?.name}` : 'System event'}
                                                                    >
                                                                        {log.user ? (
                                                                            <>
                                                                                <UserAvatar user={log.user} size="md" />
                                                                                <div>
                                                                                    <div className="text-sm font-medium text-stone-950">
                                                                                        {log.user.name}
                                                                                    </div>
                                                                                    <div className="text-xs text-stone-500">
                                                                                        {log.user.email}
                                                                                    </div>
                                                                                </div>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Avatar className="h-9 w-9">
                                                                                    <AvatarFallback className="bg-[#f6eee8] text-stone-500">
                                                                                        <Terminal className="h-3.5 w-3.5" />
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                                <div>
                                                                                    <div className="text-sm font-medium italic text-stone-950">
                                                                                        System
                                                                                    </div>
                                                                                    <div className="text-xs text-stone-500">
                                                                                        Automated process
                                                                                    </div>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        {category === 'all' && (
                                                                            <span
                                                                                className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                                                                                    log.category === 'security'
                                                                                        ? 'bg-[#fff0ea] text-[#b24b23]'
                                                                                        : 'bg-[#f3f0ec] text-stone-500'
                                                                                }`}
                                                                            >
                                                                                {log.category === 'security' ? 'Security' : 'Activity'}
                                                                            </span>
                                                                        )}
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`gap-1 rounded-xl border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${actionBadge.className}`}
                                                                        >
                                                                            <ActionIcon className="h-3 w-3" />
                                                                            {actionBadge.label}
                                                                        </Badge>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span className="text-sm leading-6 text-stone-800">
                                                                        {log.description}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="cursor-help rounded-full bg-[#f7efe9] px-3 py-1 font-mono text-xs text-stone-600">
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
                                        </div>
                                    )}
                                </CardContent>
                                {logs.last_page > 1 && <AuditPagination logs={logs} filters={filters} />}
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
