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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    Download,
    MoreHorizontal,
    ScrollText,
    Search,
    Shield,
    UserCheck,
    UserX,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type UserRole = 'super-admin' | 'admin' | 'user';

interface UserRow {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    last_login_at: string | null;
    last_login_ip: string | null;
    role: UserRole;
}

interface Props extends PageProps {
    users: PaginatedResponse<UserRow>;
    filters: {
        search?: string;
        role?: string;
        status?: string;
    };
}

const avatarColors = [
    'bg-amber-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-red-500',
    'bg-pink-500',
];

const getAvatarColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : parts[0]?.[1] ?? '';
    return `${first}${last}`.toUpperCase();
}

function getRoleBadge(role: UserRole) {
    switch (role) {
        case 'super-admin':
            return 'bg-primary text-primary-foreground';
        case 'admin':
            return 'border border-border bg-muted text-foreground';
        default:
            return 'border border-border bg-muted text-muted-foreground';
    }
}

function getRoleLabel(role: UserRole) {
    switch (role) {
        case 'super-admin':
            return 'Super Admin';
        case 'admin':
            return 'Admin';
        default:
            return 'User';
    }
}

function formatLastActive(value: string | null) {
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
    const [userToDeactivate, setUserToDeactivate] = useState<UserRow | null>(null);
    const [roleDialogUser, setRoleDialogUser] = useState<UserRow | null>(null);
    const [selectedRole, setSelectedRole] = useState<UserRole>('user');

    const currentCountLabel = `Showing ${users.data.length} of ${users.total} users`;

    const submitFilters = (override?: Partial<{ search: string; role: string; status: string }>) => {
        const next = {
            search,
            role,
            status,
            ...override,
        };

        const query = Object.fromEntries(
            Object.entries(next).filter(([, value]) => value && value !== 'all')
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
        router.get(route('admin.users'), {});
    };

    const openRoleDialog = (user: UserRow) => {
        setRoleDialogUser(user);
        setSelectedRole(user.role);
    };

    const saveRoleChange = () => {
        if (!roleDialogUser) {
            return;
        }

        router.patch(
            route('admin.users.role', roleDialogUser.id),
            { role: selectedRole },
            {
                preserveScroll: true,
                onFinish: () => setRoleDialogUser(null),
            }
        );
    };

    const confirmDeactivate = () => {
        if (!userToDeactivate) {
            return;
        }

        router.patch(
            route('admin.users.deactivate', userToDeactivate.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => setUserToDeactivate(null),
            }
        );
    };

    const handleActivate = (userId: number) => {
        router.patch(route('admin.users.activate', userId), {}, { preserveScroll: true });
    };

    const goToPage = (url: string | null) => {
        if (!url) {
            return;
        }

        router.get(url, {}, { preserveScroll: true, preserveState: true });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">User Management</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage user accounts, roles, and access status.
                    </p>
                    <p className="text-xs text-muted-foreground">Admin &#8250; User Management</p>
                </div>
            }
        >
            <Head title="User Management" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
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
                                            className="bg-background pl-9"
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
                                            <SelectTrigger className="bg-background">
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
                                            <SelectTrigger className="bg-background">
                                                <SelectValue placeholder="All" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All</SelectItem>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Button type="submit" variant="outline" className="lg:hidden">
                                        <Search className="h-4 w-4" />
                                        Search
                                    </Button>
                                </form>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <Button variant="outline" asChild>
                                        <a href={route('admin.users.export')}>
                                            <Download className="h-4 w-4" />
                                            Export
                                        </a>
                                    </Button>
                                    <p className="text-sm text-muted-foreground">{currentCountLabel}</p>
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
                                <TableHeader className="bg-muted [&_tr]:border-border">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="bg-muted text-muted-foreground">User Profile</TableHead>
                                        <TableHead className="bg-muted text-muted-foreground">Role</TableHead>
                                        <TableHead className="bg-muted text-muted-foreground">Status</TableHead>
                                        <TableHead className="bg-muted text-muted-foreground">Last Active</TableHead>
                                        <TableHead className="bg-muted text-muted-foreground">Last Login IP</TableHead>
                                        <TableHead className="bg-muted text-muted-foreground text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.length === 0 ? (
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                No users matched your current filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        users.data.map((user) => (
                                            <TableRow key={user.id} className="border-border hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${getAvatarColor(
                                                                user.name
                                                            )}`}
                                                        >
                                                            {getInitials(user.name)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-foreground">{user.name}</p>
                                                            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${getRoleBadge(user.role)}`}>
                                                        {getRoleLabel(user.role)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={`text-xs ${
                                                                user.is_active ? 'text-green-500' : 'text-muted-foreground'
                                                            }`}
                                                        >
                                                            &#9679;
                                                        </span>
                                                        <span
                                                            className={`text-xs font-medium ${
                                                                user.is_active
                                                                    ? 'text-foreground'
                                                                    : 'text-muted-foreground'
                                                            }`}
                                                        >
                                                            {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatLastActive(user.last_login_at)}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                                                        {user.last_login_ip || 'Unavailable'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                                <span className="sr-only">Open actions</span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={route('admin.audit-logs', { user: user.email })}>
                                                                    <ScrollText className="h-4 w-4" />
                                                                    View Audit Logs
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />

                                                            {user.id === authUserId ? (
                                                                <div className="px-2 py-1 text-xs text-muted-foreground">
                                                                    Current account
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {user.is_active ? (
                                                                        <DropdownMenuItem
                                                                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                                            onClick={() => setUserToDeactivate(user)}
                                                                        >
                                                                            <UserX className="h-4 w-4 text-destructive" />
                                                                            Deactivate Account
                                                                        </DropdownMenuItem>
                                                                    ) : (
                                                                        <DropdownMenuItem onClick={() => handleActivate(user.id)}>
                                                                            <UserCheck className="h-4 w-4 text-green-600" />
                                                                            Activate Account
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => openRoleDialog(user)}>
                                                                        <Shield className="h-4 w-4" />
                                                                        Change Role
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {users.last_page > 1 && (
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing page {users.current_page} of {users.last_page}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                {users.links.map((link, index) => {
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
                                            onClick={() => goToPage(link.url)}
                                        >
                                            {label}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={userToDeactivate !== null} onOpenChange={(open) => !open && setUserToDeactivate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deactivate Account</DialogTitle>
                        <DialogDescription>
                            Deactivating this account will immediately end all active sessions for this user.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setUserToDeactivate(null)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDeactivate}>
                            Deactivate Account
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={roleDialogUser !== null} onOpenChange={(open) => !open && setRoleDialogUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Change Role</DialogTitle>
                        <DialogDescription>
                            {roleDialogUser
                                ? `${roleDialogUser.name} is currently ${getRoleLabel(roleDialogUser.role)}.`
                                : 'Update this user role.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <RadioGroup value={selectedRole} onChange={(value) => setSelectedRole(value as UserRole)}>
                            {(['super-admin', 'admin', 'user'] as UserRole[]).map((roleOption) => (
                                <label
                                    key={roleOption}
                                    className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
                                >
                                    <RadioGroupItem value={roleOption} />
                                    <span className="text-sm text-foreground">{getRoleLabel(roleOption)}</span>
                                </label>
                            ))}
                        </RadioGroup>

                        <p className="text-sm text-muted-foreground">
                            Changing a user's role takes effect immediately and is logged in the audit trail.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setRoleDialogUser(null)}>
                            Cancel
                        </Button>
                        <Button type="button" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={saveRoleChange}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
