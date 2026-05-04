import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { RoleBadge, normalizeRoleBadgeRole } from '@/components/RoleBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableHeader } from '@/components/SortableHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import UserAvatar from '@/components/UserAvatar';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cn } from '@/lib/utils';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
    Download,
    MailCheck,
    MailX,
    MoreHorizontal,
    PauseCircle,
    PlayCircle,
    ScrollText,
    Search,
    Shield,
    ShieldCheck,
    ShieldOff,
    UserCheck,
    UserX,
} from 'lucide-react';
import { FormEvent, useState } from 'react';

type AssignableRole = 'super-admin' | 'admin' | 'user';

interface UserRow {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    two_factor_enabled: boolean;
    email_verified_at: string | null;
    deletion_requested_at: string | null;
    deletion_scheduled_for: string | null;
    last_login_at: string | null;
    last_login_ip: string | null;
    role: string;
    avatar_url: string | null;
}

interface Props extends PageProps {
    users: PaginatedResponse<UserRow>;
    filters: {
        search?: string;
        role?: string;
        status?: string;
        verification?: string;
    };
    sort: string;
    direction: 'asc' | 'desc';
}

function normalizeAssignableRole(roleName: string | null | undefined): AssignableRole {
    const normalized = (roleName ?? 'user').toLowerCase().replace(/[\s_]+/g, '-');

    if (normalized === 'super-admin') {
        return 'super-admin';
    }

    if (normalized === 'admin') {
        return 'admin';
    }

    return 'user';
}

function getRoleLabel(role: AssignableRole) {
    switch (role) {
        case 'super-admin':
            return 'Super Admin';
        case 'admin':
            return 'Admin';
        default:
            return 'User';
    }
}

function formatRelativeTime(value: string | null) {
    if (!value) {
        return 'Never';
    }

    return formatDistanceToNow(parseISO(value), {
        addSuffix: true,
        includeSeconds: false,
    }).replace(/^about /, '');
}

export default function AdminUsersIndex({ users, filters, auth, sort, direction }: Props) {
    const authUserId = auth.user.id;
    const isSuperAdminViewer = auth.roles?.includes('super-admin') ?? false;
    const [search, setSearch] = useState(filters.search ?? '');
    const [role, setRole] = useState(filters.role ?? 'all');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<AssignableRole>('user');
    const verification = filters.verification ?? '';

    const currentCountLabel = `Showing ${users.data.length} of ${users.total} users`;
    const activeQuery = Object.fromEntries(
        Object.entries({
            search: filters.search ?? '',
            role: filters.role ?? '',
            status: filters.status ?? '',
            verification,
        }).filter(([, value]) => value !== undefined && value !== '' && value !== 'all'),
    );

    const submitFilters = (override?: Partial<{ search: string; role: string; status: string }>) => {
        const next = {
            search,
            role,
            status,
            ...override,
        };

        const query = Object.fromEntries(
            Object.entries({
                ...next,
                verification,
                sort,
                direction,
            }).filter(([, value]) => value && value !== 'all'),
        );

        router.get(route('admin.users'), query, {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setSearch('');
        setRole('all');
        setStatus('all');
        router.get(route('admin.users'), {
            sort,
            direction,
        });
    };

    const handleToggleActive = (user: UserRow) => {
        setSelectedUser(user);
        setStatusDialogOpen(true);
    };

    const openRoleDialog = (user: UserRow) => {
        setSelectedUser(user);
        setSelectedRole(normalizeAssignableRole(user.role));
        setRoleDialogOpen(true);
    };

    const handleRoleChange = () => {
        if (!selectedUser) {
            return;
        }

        router.patch(
            route('admin.users.role', selectedUser.id),
            { role: selectedRole },
            {
                preserveScroll: true,
                onFinish: () => setRoleDialogOpen(false),
            },
        );
    };

    const handleStatusToggle = () => {
        if (!selectedUser) {
            return;
        }

        const routeName = selectedUser.is_active ? 'admin.users.deactivate' : 'admin.users.activate';

        router.patch(route(routeName, selectedUser.id), {}, {
            preserveScroll: true,
            onFinish: () => setStatusDialogOpen(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                        Admin Control
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                            User Management
                        </h1>
                        <p className="max-w-3xl text-sm text-stone-500">
                            Search, review, and manage account access across the system. Status,
                            2FA, verification, and recent activity stay visible in one place.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="User Management" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 rounded-[30px] border border-[#ecd8ce] bg-[#fdf8f4] p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-3">
                            <Badge className="rounded-full border border-[#efcdbf] bg-[#fff4ee] px-3 py-1 text-sm font-medium text-[#a64824] hover:bg-[#fff4ee]">
                                Admin directory
                            </Badge>
                            <div className="space-y-1">
                                <h2 className="text-4xl font-semibold tracking-tight text-stone-950">
                                    Accounts, roles, and verification in one view
                                </h2>
                                <p className="max-w-3xl text-sm leading-7 text-stone-500">
                                    This workspace is optimized for reviewing account posture quickly
                                    without losing access to deeper actions like audit review and role changes.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                variant="outline"
                                className="h-11 rounded-2xl border-[#d7c3b7] bg-white px-4 text-stone-700"
                                asChild
                            >
                                <a href={route('admin.users.export')}>
                                    <Download className="h-4 w-4" />
                                    Export CSV
                                </a>
                            </Button>
                            <div className="rounded-full border border-[#ead8cd] bg-white px-4 py-2 text-sm text-stone-600">
                                {currentCountLabel}
                            </div>
                            <div aria-live="polite" className="sr-only">
                                {currentCountLabel}
                            </div>
                        </div>
                    </div>

                    <Card className="rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <form
                                    onSubmit={(event: FormEvent) => {
                                        event.preventDefault();
                                        submitFilters();
                                    }}
                                    className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-center"
                                >
                                    <div className="relative w-full xl:max-w-xl">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search by name or email..."
                                            aria-label="Search users by name or email"
                                            className="h-12 rounded-2xl border-[#e8d7cc] bg-[#fffaf7] pl-10 text-sm shadow-none focus-visible:ring-amber-200"
                                        />
                                    </div>

                                    <div className="w-full xl:w-[180px]">
                                        <Select
                                            value={role}
                                            onValueChange={(value) => {
                                                setRole(value);
                                                submitFilters({ role: value });
                                            }}
                                        >
                                            <SelectTrigger
                                                aria-label="Filter users by role"
                                                className="h-12 rounded-2xl border-[#e8d7cc] bg-white shadow-none"
                                            >
                                                <SelectValue placeholder="All Roles" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Roles</SelectItem>
                                                <SelectItem value="super-admin">Super Admin</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="user">User</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-full xl:w-[180px]">
                                        <Select
                                            value={status}
                                            onValueChange={(value) => {
                                                setStatus(value);
                                                submitFilters({ status: value });
                                            }}
                                        >
                                            <SelectTrigger
                                                aria-label="Filter users by status"
                                                className="h-12 rounded-2xl border-[#e8d7cc] bg-white shadow-none"
                                            >
                                                <SelectValue placeholder="All Statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </form>

                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 rounded-2xl border-[#d7c3b7] bg-white px-4 text-stone-700"
                                        onClick={resetFilters}
                                    >
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-[#fff8f4] [&_tr]:border-[#ead8cd]">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="py-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            <SortableHeader
                                                column="name"
                                                label="User"
                                                currentSort={sort}
                                                currentDirection={direction}
                                                routeName="admin.users"
                                                query={activeQuery}
                                            />
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Role
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Status
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            2FA
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Verified
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            <SortableHeader
                                                column="last_login_at"
                                                label="Last Active"
                                                currentSort={sort}
                                                currentDirection={direction}
                                                defaultDirection="desc"
                                                routeName="admin.users"
                                                query={activeQuery}
                                            />
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Last Login IP
                                        </TableHead>
                                        <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-40 text-center text-stone-500">
                                                No users matched your current filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.data.map((user) => {
                                            const isSelf = user.id === authUserId;
                                            const pendingDeletionBadge = (
                                                <Badge
                                                    variant="outline"
                                                    className="rounded-full border-[#eac8bb] bg-[#fff1eb] px-2.5 py-1 text-xs text-[#b04c23]"
                                                >
                                                    Pending Deletion
                                                </Badge>
                                            );

                                            return (
                                                <TableRow
                                                    key={user.id}
                                                    className={cn(
                                                        'border-[#f0e1d8] hover:bg-[#fffaf7]',
                                                        !user.is_active && 'opacity-70',
                                                    )}
                                                >
                                                    <TableCell className="py-5">
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar user={user} size="md" />
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-medium text-stone-950">
                                                                    {user.name}
                                                                </div>
                                                                <div className="text-sm text-stone-500">
                                                                    {user.email}
                                                                </div>
                                                                {user.deletion_requested_at && (
                                                                    <div className="mt-2">
                                                                        {isSuperAdminViewer && user.deletion_scheduled_for ? (
                                                                            <TooltipProvider>
                                                                                <Tooltip>
                                                                                    <TooltipTrigger asChild>
                                                                                        <span>{pendingDeletionBadge}</span>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>
                                                                                        Scheduled for{' '}
                                                                                        {format(
                                                                                            new Date(user.deletion_scheduled_for),
                                                                                            'PPP',
                                                                                        )}
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        ) : (
                                                                            pendingDeletionBadge
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <RoleBadge role={normalizeRoleBadgeRole(user.role)} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={cn(
                                                                    'h-2.5 w-2.5 rounded-full',
                                                                    user.is_active ? 'bg-emerald-500' : 'bg-stone-300',
                                                                )}
                                                            />
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    'rounded-full px-2.5 py-1 text-xs',
                                                                    user.is_active
                                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                        : 'border-stone-200 bg-stone-50 text-stone-500',
                                                                )}
                                                            >
                                                                {user.is_active ? 'Active' : 'Inactive'}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex rounded-full bg-[#f8f3ef] p-2">
                                                                        {user.two_factor_enabled ? (
                                                                            <ShieldCheck className="h-4 w-4 text-emerald-700" />
                                                                        ) : (
                                                                            <ShieldOff className="h-4 w-4 text-stone-400" />
                                                                        )}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {user.two_factor_enabled ? '2FA enabled' : '2FA not enabled'}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex rounded-full bg-[#f8f3ef] p-2">
                                                                        {user.email_verified_at ? (
                                                                            <MailCheck className="h-4 w-4 text-emerald-700" />
                                                                        ) : (
                                                                            <MailX className="h-4 w-4 text-amber-600" />
                                                                        )}
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    {user.email_verified_at ? 'Email verified' : 'Email not verified'}
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-stone-600">
                                                        {formatRelativeTime(user.last_login_at)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="rounded-full bg-[#f7efe9] px-3 py-1 font-mono text-xs text-stone-600">
                                                            {user.last_login_ip ?? '-'}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {!isSelf && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="group h-9 w-9 rounded-full"
                                                                                aria-label={user.is_active ? 'Deactivate user' : 'Activate user'}
                                                                                onClick={() => handleToggleActive(user)}
                                                                            >
                                                                                {user.is_active ? (
                                                                                    <PauseCircle className="h-4 w-4 text-stone-500 transition-colors group-hover:text-destructive" />
                                                                                ) : (
                                                                                    <PlayCircle className="h-4 w-4 text-stone-500 transition-colors group-hover:text-emerald-700" />
                                                                                )}
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            {user.is_active ? 'Deactivate user' : 'Activate user'}
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 rounded-full"
                                                                        aria-label={`Actions for ${user.name}`}
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem asChild>
                                                                        <Link href={route('admin.audit-logs', { user: user.email })}>
                                                                            <ScrollText className="mr-2 h-4 w-4" />
                                                                            View Audit Logs
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    {!isSelf && (
                                                                        <>
                                                                            {user.is_active ? (
                                                                                <DropdownMenuItem
                                                                                    className="text-destructive focus:text-destructive"
                                                                                    onClick={() => handleToggleActive(user)}
                                                                                >
                                                                                    <UserX className="mr-2 h-4 w-4" />
                                                                                    Deactivate Account
                                                                                </DropdownMenuItem>
                                                                            ) : (
                                                                                <DropdownMenuItem
                                                                                    className="text-green-700 focus:text-green-700"
                                                                                    onClick={() => handleToggleActive(user)}
                                                                                >
                                                                                    <UserCheck className="mr-2 h-4 w-4" />
                                                                                    Activate Account
                                                                                </DropdownMenuItem>
                                                                            )}
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                                                                                <Shield className="mr-2 h-4 w-4" />
                                                                                Change Role
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                    {isSelf && (
                                                                        <DropdownMenuItem disabled className="text-muted-foreground">
                                                                            <ShieldOff className="mr-2 h-4 w-4" />
                                                                            Cannot modify own account
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>

                            <div className="flex flex-col gap-4 border-t border-[#ead8cd] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-stone-500">{currentCountLabel}</p>
                                {users.last_page > 1 && (
                                    <Pagination className="mx-0 w-auto justify-end">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href={users.prev_page_url ?? '#'}
                                                    className={!users.prev_page_url ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                            {users.links.slice(1, -1).map((link, index) => (
                                                <PaginationItem key={`${link.label}-${index}`}>
                                                    {link.label === '...' ? (
                                                        <PaginationEllipsis />
                                                    ) : (
                                                        <PaginationLink href={link.url ?? '#'} isActive={link.active}>
                                                            {link.label}
                                                        </PaginationLink>
                                                    )}
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext
                                                    href={users.next_page_url ?? '#'}
                                                    className={!users.next_page_url ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {selectedUser?.is_active ? 'Deactivate Account?' : 'Activate Account?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedUser?.is_active
                                ? `Deactivating this account will immediately end all active sessions for ${selectedUser?.name}. They will not be able to log in until reactivated.`
                                : `Activating this account will allow ${selectedUser?.name} to sign in again immediately.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className={cn(
                                selectedUser?.is_active
                                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                    : 'bg-green-700 text-white hover:bg-green-700/90',
                            )}
                            onClick={handleStatusToggle}
                        >
                            {selectedUser?.is_active ? 'Deactivate' : 'Activate'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Role</DialogTitle>
                        <DialogDescription>
                            Changing {selectedUser?.name}&apos;s role takes effect immediately and
                            is logged in the audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <RadioGroup
                        value={selectedRole}
                        onValueChange={(value) => setSelectedRole(value as AssignableRole)}
                        className="space-y-2 py-2"
                    >
                        {(['super-admin', 'admin', 'user'] as AssignableRole[]).map((roleOption) => (
                            <div
                                key={roleOption}
                                className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50"
                            >
                                <RadioGroupItem value={roleOption} id={roleOption} />
                                <Label htmlFor={roleOption} className="cursor-pointer font-medium capitalize">
                                    {getRoleLabel(roleOption)}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-primary text-primary-foreground" onClick={handleRoleChange}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
