import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import GravatarAvatar from '@/components/GravatarAvatar';
import {
    Activity,
    Download,
    Lock,
    LogIn,
    LogOut,
    Share2,
    ShieldAlert,
    ShieldCheck,
    SlidersHorizontal,
    Terminal,
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
        avatar_url: string | null;
    } | null;
}

interface Props extends PageProps {
    logs: PaginatedResponse<AuditLogRow>;
    filters: {
        action?: string;
        from_date?: string;
        to_date?: string;
        user?: string;
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



function getActionLabel(action: AuditAction) {
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

function getActionBadge(action: AuditAction) {
    switch (action) {
        case 'login_success':
            return { icon: LogIn, className: 'bg-green-500/15 text-green-700 dark:text-green-400' };
        case 'login_failed':
            return { icon: LogIn, className: 'bg-destructive/15 text-destructive' };
        case 'logout':
            return { icon: LogOut, className: 'bg-muted text-muted-foreground' };
        case 'document_uploaded':
            return { icon: Upload, className: 'bg-primary/15 text-primary' };
        case 'document_downloaded':
            return { icon: Download, className: 'bg-primary/15 text-primary' };
        case 'document_shared':
            return { icon: Share2, className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' };
        case 'document_deleted':
            return { icon: Trash2, className: 'bg-destructive/15 text-destructive' };
        case '2fa_enabled':
        case 'two_factor_enabled':
            return { icon: ShieldCheck, className: 'bg-green-500/15 text-green-700 dark:text-green-400' };
        case 'account_locked':
            return { icon: Lock, className: 'bg-destructive/15 text-destructive' };
        case 'integrity_violation':
            return { icon: ShieldAlert, className: 'bg-destructive/15 text-destructive' };
        default:
            return { icon: Activity, className: 'bg-muted text-muted-foreground' };
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

function getTargetDetails(action: string, metadata: Record<string, any> | null) {
    switch (action) {
        case 'login_success':
            return {
                primary: 'Secure Login',
                secondary: `2FA: ${metadata?.two_factor ? 'Enabled' : 'Disabled'}`,
            };
        case 'login_failed':
            return { primary: 'Failed Attempt', secondary: 'Invalid credentials' };
        case 'document_uploaded':
            return {
                primary: metadata?.document_name ?? 'Document',
                secondary: 'Encrypted and stored',
            };
        case 'document_downloaded':
            return {
                primary: metadata?.document_name ?? 'Document',
                secondary: 'Decrypted on-the-fly',
            };
        case 'document_shared':
            return {
                primary: metadata?.document_name ?? 'Document',
                secondary: metadata?.shared_with ? `Shared with ${metadata.shared_with}` : 'Shared',
            };
        case 'document_deleted':
            return {
                primary: metadata?.document_name ?? 'Document',
                secondary: 'Moved to trash',
            };
        case 'account_locked':
            return { primary: 'Account Locked', secondary: 'Too many failed attempts' };
        case 'integrity_violation':
            return {
                primary: metadata?.document_name ?? 'Document',
                secondary: 'Hash mismatch detected',
            };
        case 'logout':
            return { primary: 'Session Ended', secondary: null };
        case '2fa_enabled':
        case 'two_factor_enabled':
            return { primary: '2FA Activated', secondary: 'TOTP configured' };
        default:
            return { primary: action.replace(/_/g, ' '), secondary: null };
    }
}

function Pagination({
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
                Showing {logs.from ?? 0}-{logs.to ?? 0} of {logs.total} logs
            </p>
            <div className="flex flex-wrap items-center gap-2">
                {logs.links.map((link, index) => {
                    const label = link.label.replace('&laquo;', '').replace('&raquo;', '').trim();

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

export default function AdminAuditLogsIndex({ logs, filters }: Props) {
    const [localFilters, setLocalFilters] = useState<Props['filters']>({
        action: filters.action ?? '',
        from_date: filters.from_date ?? '',
        to_date: filters.to_date ?? '',
        user: filters.user ?? '',
    });

    const exportQuery = Object.fromEntries(
        Object.entries(localFilters).filter(([, value]) => value !== undefined && value !== '')
    );

    const applyFilters = () => {
        router.get(route('admin.audit-logs'), exportQuery, {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        const reset = { action: '', from_date: '', to_date: '', user: '' };
        setLocalFilters(reset);
        router.get(route('admin.audit-logs'), {});
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold leading-tight text-foreground">Global Audit Log</h2>
                    <p className="text-sm text-muted-foreground">Admin {'›'} Audit Logs</p>
                </div>
            }
        >
            <Head title="Global Audit Log" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="rounded-lg border border-border bg-card p-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
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
                                <a href={route('admin.audit-logs.export', exportQuery)}>
                                    <Download className="h-4 w-4" />
                                    Export CSV
                                </a>
                            </Button>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Target / Details</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                                            No logs found for the selected filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.data.map((log) => {
                                        const actionBadge = getActionBadge(log.action);
                                        const status = getStatusBadge(log.action);
                                        const details = getTargetDetails(log.action, log.metadata);
                                        const ActionIcon = actionBadge.icon;

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
                                                <TableCell>
                                                    {log.user ? (
                                                        <div className="flex items-center gap-2.5">
                                                            <GravatarAvatar 
                                                                name={log.user.name} 
                                                                avatarUrl={log.user.avatar_url} 
                                                                size="sm" 
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="truncate text-sm font-medium text-foreground">
                                                                    {log.user.name}
                                                                </div>
                                                                <div className="truncate text-xs text-muted-foreground">
                                                                    {log.user.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                                <Terminal className="h-3.5 w-3.5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-medium text-foreground">System</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Automated event
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${actionBadge.className}`}
                                                    >
                                                        <ActionIcon className="h-3 w-3" />
                                                        {getActionLabel(log.action)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {details.primary || details.secondary ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-foreground">
                                                                {details.primary}
                                                            </span>
                                                            {details.secondary && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {details.secondary}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-foreground">
                                                        {log.ip_address || '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${status.className}`}
                                                    >
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

                    {logs.last_page > 1 && <Pagination logs={logs} filters={filters} />}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
