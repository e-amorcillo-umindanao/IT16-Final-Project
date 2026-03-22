import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PaginatedResponse } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    Activity,
    Download,
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
import { ReactNode, useMemo, useState } from 'react';

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

export interface AuditLogRow {
    id: number;
    action: AuditAction;
    metadata: Record<string, unknown> | null;
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

interface Filters {
    action?: string;
    from_date?: string;
    to_date?: string;
    user?: string;
}

interface Props {
    pageTitle: string;
    title: string;
    breadcrumb: ReactNode;
    routeName: string;
    exportRouteName: string;
    showUserFilter: boolean;
    showUserColumn: boolean;
    logs: PaginatedResponse<AuditLogRow>;
    filters: Filters;
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

function getActionLabel(action: AuditAction): string {
    switch (action) {
        case 'login_success':
            return 'Login';
        case 'login_failed':
            return 'Failed Login';
        case 'logout':
            return 'Logout';
        case 'document_uploaded':
            return 'Upload';
        case 'document_downloaded':
            return 'Download';
        case 'document_shared':
            return 'Share';
        case 'document_deleted':
            return 'Delete';
        case '2fa_enabled':
        case 'two_factor_enabled':
            return '2FA Enabled';
        case 'account_locked':
            return 'Account Locked';
        case 'integrity_violation':
            return 'Integrity Violation';
        default:
            return action.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    }
}

function getActionPresentation(action: AuditAction) {
    switch (action) {
        case 'login_success':
            return {
                icon: LogIn,
                circleClass: 'bg-green-500/20 text-green-700',
            };
        case 'login_failed':
            return {
                icon: LogIn,
                circleClass: 'bg-destructive/20 text-destructive',
            };
        case 'logout':
            return {
                icon: LogOut,
                circleClass: 'bg-muted text-muted-foreground',
            };
        case 'document_uploaded':
            return {
                icon: Upload,
                circleClass: 'bg-primary/20 text-primary',
            };
        case 'document_downloaded':
            return {
                icon: Download,
                circleClass: 'bg-primary/20 text-primary',
            };
        case 'document_shared':
            return {
                icon: Share2,
                circleClass: 'bg-blue-500/20 text-blue-600',
            };
        case 'document_deleted':
            return {
                icon: Trash2,
                circleClass: 'bg-destructive/20 text-destructive',
            };
        case '2fa_enabled':
        case 'two_factor_enabled':
            return {
                icon: ShieldCheck,
                circleClass: 'bg-green-500/20 text-green-700',
            };
        case 'account_locked':
            return {
                icon: Lock,
                circleClass: 'bg-destructive/20 text-destructive',
            };
        case 'integrity_violation':
            return {
                icon: ShieldAlert,
                circleClass: 'bg-destructive/20 text-destructive',
            };
        default:
            return {
                icon: Activity,
                circleClass: 'bg-muted text-muted-foreground',
            };
    }
}

function getStatusBadge(action: AuditAction) {
    switch (action) {
        case 'login_success':
        case 'document_uploaded':
        case 'document_downloaded':
        case '2fa_enabled':
        case 'two_factor_enabled':
            return { label: 'SUCCESS', className: 'bg-green-500/15 text-green-700 dark:text-green-400' };
        case 'document_shared':
        case 'logout':
        case 'profile_updated':
            return { label: 'INFO', className: 'bg-primary/15 text-primary' };
        case 'login_failed':
        case 'document_deleted':
        case 'account_locked':
        case 'integrity_violation':
            return { label: 'FAILED', className: 'bg-destructive/15 text-destructive' };
        default:
            return { label: 'LOG', className: 'bg-muted text-muted-foreground' };
    }
}

function getTargetDetails(log: AuditLogRow) {
    const metadata = log.metadata ?? {};
    const originalName =
        (metadata.original_name as string | undefined) ??
        (log.auditable?.original_name ?? undefined) ??
        (metadata.shared_with as string | undefined);

    switch (log.action) {
        case 'document_uploaded':
            return {
                target: originalName ?? '—',
                description: originalName ? 'Encrypted and stored' : undefined,
            };
        case 'document_downloaded':
            return {
                target: originalName ?? '—',
                description: originalName ? 'Decrypted on-the-fly' : undefined,
            };
        case 'document_shared':
            return {
                target: originalName ?? '—',
                description: metadata.shared_with
                    ? `Shared with ${String(metadata.shared_with)}`
                    : 'Shared',
            };
        case 'document_deleted':
            return {
                target: originalName ?? '—',
                description: originalName ? 'Moved to trash' : undefined,
            };
        case 'login_success':
            return {
                target: 'Secure Login',
                description:
                    typeof metadata.multi_factor === 'boolean'
                        ? `Multi-factor: ${metadata.multi_factor ? 'enabled' : 'disabled'}`
                        : 'Multi-factor: unavailable',
            };
        case 'login_failed':
            return {
                target: 'Failed Attempt',
                description: 'Invalid credentials',
            };
        case 'account_locked':
            return {
                target: 'Account Locked',
                description: 'Too many failed attempts',
            };
        case 'integrity_violation':
            return {
                target: originalName ?? '—',
                description: 'Hash mismatch detected',
            };
        default:
            return {
                target: getActionLabel(log.action),
                description: undefined,
            };
    }
}

function Pagination({ logs, routeName, filters }: { logs: PaginatedResponse<AuditLogRow>; routeName: string; filters: Filters }) {
    const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
    );

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
                Showing {logs.from ?? 0}-{logs.to ?? 0} of {logs.total} logs
            </p>
            <div className="flex flex-wrap items-center gap-2">
                {logs.links.map((link, index) => {
                    const label = link.label
                        .replace('&laquo;', '')
                        .replace('&raquo;', '')
                        .trim();

                    return (
                        <Button
                            key={`${label}-${index}`}
                            variant="outline"
                            size="sm"
                            disabled={!link.url}
                            className={link.active ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
                            onClick={() => {
                                if (link.url) {
                                    router.get(link.url, cleanedFilters, {
                                        preserveScroll: true,
                                        preserveState: true,
                                    });
                                }
                            }}
                        >
                            {label}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}

export default function AuditLogView({
    pageTitle,
    title,
    breadcrumb,
    routeName,
    exportRouteName,
    showUserFilter,
    showUserColumn,
    logs,
    filters,
}: Props) {
    const [localFilters, setLocalFilters] = useState<Filters>({
        action: filters.action ?? '',
        from_date: filters.from_date ?? '',
        to_date: filters.to_date ?? '',
        user: filters.user ?? '',
    });

    const exportQuery = useMemo(
        () =>
            Object.fromEntries(
                Object.entries(localFilters).filter(([, value]) => value !== undefined && value !== '')
            ),
        [localFilters]
    );

    const applyFilters = () => {
        router.get(route(routeName), exportQuery, {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const reset = { action: '', from_date: '', to_date: '', user: '' };
        setLocalFilters(reset);
        router.get(route(routeName), {});
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold leading-tight text-foreground">{title}</h2>
                    <p className="text-sm text-muted-foreground">{breadcrumb}</p>
                </div>
            }
        >
            <Head title={pageTitle} />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    <div className="rounded-lg border border-border bg-card p-4">
                        <div className={`grid grid-cols-1 gap-4 ${showUserFilter ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
                            <div className="space-y-2">
                                <Label htmlFor="action">Action Type</Label>
                                <Select
                                    value={localFilters.action || 'all'}
                                    onValueChange={(value) =>
                                        setLocalFilters((current) => ({
                                            ...current,
                                            action: value === 'all' ? '' : value,
                                        }))
                                    }
                                >
                                    <SelectTrigger id="action" className="bg-background">
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

                            <div className="space-y-2">
                                <Label htmlFor="from_date">From Date</Label>
                                <input
                                    id="from_date"
                                    type="date"
                                    value={localFilters.from_date ?? ''}
                                    onChange={(event) =>
                                        setLocalFilters((current) => ({
                                            ...current,
                                            from_date: event.target.value,
                                        }))
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="to_date">To Date</Label>
                                <input
                                    id="to_date"
                                    type="date"
                                    value={localFilters.to_date ?? ''}
                                    onChange={(event) =>
                                        setLocalFilters((current) => ({
                                            ...current,
                                            to_date: event.target.value,
                                        }))
                                    }
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                                />
                            </div>

                            {showUserFilter && (
                                <div className="space-y-2">
                                    <Label htmlFor="user">User</Label>
                                    <Input
                                        id="user"
                                        value={localFilters.user ?? ''}
                                        onChange={(event) =>
                                            setLocalFilters((current) => ({
                                                ...current,
                                                user: event.target.value,
                                            }))
                                        }
                                        placeholder="Name or email"
                                        className="bg-background"
                                    />
                                </div>
                            )}

                            <div className="flex items-end justify-start gap-3 lg:justify-end">
                                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={applyFilters}>
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Apply Filters
                                </Button>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-border bg-card">
                        <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-foreground">Security Audit Trail</h3>
                            </div>
                            <Button variant="outline" asChild>
                                <a href={route(exportRouteName, exportQuery)}>
                                    <Download className="h-4 w-4" />
                                    Export CSV
                                </a>
                            </Button>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    {showUserColumn && <TableHead>User</TableHead>}
                                    <TableHead>Action</TableHead>
                                    <TableHead>Target / Details</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={showUserColumn ? 6 : 5} className="h-40 text-center text-muted-foreground">
                                            No logs found for the selected filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.data.map((log) => {
                                        const actionPresentation = getActionPresentation(log.action);
                                        const status = getStatusBadge(log.action);
                                        const details = getTargetDetails(log);
                                        const ActionIcon = actionPresentation.icon;

                                        return (
                                            <TableRow key={log.id} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(log.created_at), 'MMM dd, yyyy')}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(new Date(log.created_at), 'HH:mm:ss')}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                {showUserColumn && (
                                                    <TableCell>
                                                        {log.user ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-sm text-foreground">{log.user.name}</span>
                                                                <span className="text-xs text-muted-foreground">{log.user.email}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-sm italic text-muted-foreground">System</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`rounded-full p-1.5 ${actionPresentation.circleClass}`}>
                                                            <ActionIcon className="h-4 w-4" />
                                                        </div>
                                                        <span className="font-medium text-foreground">{getActionLabel(log.action)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-foreground">{details.target}</span>
                                                        {details.description && (
                                                            <span className="text-xs text-muted-foreground">{details.description}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                                                        {log.ip_address || '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${status.className}`}>
                                                        {status.label}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {logs.last_page > 1 && <Pagination logs={logs} routeName={routeName} filters={filters} />}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
