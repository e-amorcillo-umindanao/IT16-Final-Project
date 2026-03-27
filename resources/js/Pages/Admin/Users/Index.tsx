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
import UserAvatar from '@/components/UserAvatar';
import { RoleBadge, normalizeRoleBadgeRole } from '@/components/RoleBadge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    Download,
    MoreHorizontal,
    ScrollText,
    Search,
    Shield,
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

    return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export default function AdminUsersIndex({ users, filters, auth }: Props) {
    const authUserId = auth.user.id;
    const [search, setSearch] = useState(filters.search ?? '');
    const [role, setRole] = useState(filters.role ?? 'all');
    const [status, setStatus] = useState(filters.status ?? 'all');
    const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
    const [roleDialogOpen, setRoleDialogOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<AssignableRole>('user');

    const currentCountLabel = `Showing ${users.data.length} of ${users.total} users`;

    const submitFilters = (override?: Partial<{ search: string; role: string; status: string }>) => {
        const next = {
            search,
            role,
            status,
            ...override,
        };

        const query = Object.fromEntries(Object.entries(next).filter(([, value]) => value && value !== 'all'));

        router.get(route('admin.users'), query, {
            preserveState: true,
            replace: true,
        });
    };

    const resetFilters = () => {
        setSearch('');
        setRole('all');
        setStatus('all');
        router.get(route('admin.users'), {});
    };

    const openDeactivateDialog = (user: UserRow) => {
        setSelectedUser(user);
        setDeactivateDialogOpen(true);
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
            }
        );
    };

    const handleDeactivate = () => {
        if (!selectedUser) {
            return;
        }

        router.patch(
            route('admin.users.deactivate', selectedUser.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setDeactivateDialogOpen(false),
            }
        );
    };

    const handleActivate = (userId: number) => {
        router.patch(route('admin.users.activate', userId), {}, { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">User Management</h2>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/admin">Admin</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>User Management</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="User Management" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <form
                                    onSubmit={(event: FormEvent) => {
                                        event.preventDefault();
                                        submitFilters();
                                    }}
                                    className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center"
                                >
                                    <div className="relative w-full lg:max-w-sm">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search by name or email..."
                                            aria-label="Search users by name or email"
                                            className="pl-9"
                                        />
                                    </div>

                                    <div className="w-full lg:w-[180px]">
                                        <Select
                                            value={role}
                                            onValueChange={(value) => {
                                                setRole(value);
                                                submitFilters({ role: value });
                                            }}
                                        >
                                            <SelectTrigger aria-label="Filter users by role">
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

                                    <div className="w-full lg:w-[160px]">
                                        <Select
                                            value={status}
                                            onValueChange={(value) => {
                                                setStatus(value);
                                                submitFilters({ status: value });
                                            }}
                                        >
                                            <SelectTrigger aria-label="Filter users by status">
                                                <SelectValue placeholder="All" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </form>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <Button variant="outline" asChild>
                                        <a href={route('admin.users.export')}>
                                            <Download className="h-4 w-4" />
                                            Export
                                        </a>
                                    </Button>
                                    <p className="text-sm text-muted-foreground">{currentCountLabel}</p>
                                    <div aria-live="polite" className="sr-only">
                                        {currentCountLabel}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={resetFilters}
                                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User Profile</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Active</TableHead>
                                        <TableHead>Last Login IP</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                No users matched your current filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.data.map((user) => {
                                            const isSelf = user.id === authUserId;

                                            return (
                                            <TableRow key={user.id} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar user={user} size="md" />
                                                        <div>
                                                            <div className="text-sm font-medium text-foreground">{user.name}</div>
                                                            <div className="text-xs text-muted-foreground">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <RoleBadge role={normalizeRoleBadgeRole(user.role)} />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className={`h-2 w-2 rounded-full ${
                                                                user.is_active ? 'bg-green-500' : 'bg-muted-foreground'
                                                            }`}
                                                        />
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                user.is_active
                                                                    ? 'border-green-500/20 bg-green-500/10 text-xs text-green-700 dark:text-green-400'
                                                                    : 'border-border text-xs text-muted-foreground'
                                                            }
                                                        >
                                                            {user.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatRelativeTime(user.last_login_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                                        {user.last_login_ip ?? '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
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
                                                                            onClick={() => openDeactivateDialog(user)}
                                                                        >
                                                                            <UserX className="mr-2 h-4 w-4" />
                                                                            Deactivate Account
                                                                        </DropdownMenuItem>
                                                                    ) : (
                                                                        <DropdownMenuItem
                                                                            className="text-green-700 focus:text-green-700"
                                                                            onClick={() => handleActivate(user.id)}
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
                                                </TableCell>
                                            </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {users.last_page > 1 && (
                        <Pagination>
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
            </div>

            <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate Account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deactivating this account will immediately end all active sessions for {selectedUser?.name}. They will not be able to log in until reactivated.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDeactivate}
                        >
                            Deactivate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Role</DialogTitle>
                        <DialogDescription>
                            Changing {selectedUser?.name}'s role takes effect immediately and is logged in the audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <RadioGroup value={selectedRole} onValueChange={(value) => setSelectedRole(value as AssignableRole)} className="space-y-2 py-2">
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
