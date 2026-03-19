import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Role {
    id: number;
    name: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    last_login_at: string | null;
    roles: Role[];
}

interface Props {
    users: {
        data: User[];
        links: any[];
    };
    roles: Role[];
    filters: {
        search: string;
    };
}

export default function AdminUsers({ users, roles, filters }: Props) {
    const authUser = usePage().props.auth.user;
    const [search, setSearch] = useState(filters.search || '');

    const getRoleBadgeClass = (roleName?: string) => {
        switch (roleName) {
            case 'super-admin':
                return 'border-[#3F2E11] bg-[#2A2010] text-primary';
            case 'admin':
                return 'border-[#17304F] bg-[#0F1B2D] text-[#60A5FA]';
            case 'user':
                return 'border-border bg-secondary text-muted-foreground';
            default:
                return 'border-border bg-secondary text-muted-foreground';
        }
    };

    const handleSearch = () => {
        router.get(route('admin.users'), { search }, { preserveState: true });
    };

    const toggleStatus = (user: User) => {
        if (user.id === authUser.id) return;
        
        router.patch(route('admin.users.toggle-active', user.id), {}, {
            onSuccess: () => toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully`),
        });
    };

    const updateRole = (user: User, roleName: string) => {
        if (user.id === authUser.id) return;

        router.patch(route('admin.users.role', user.id), { role: roleName }, {
            onSuccess: () => toast.success(`Role updated to ${roleName}`),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-semibold leading-tight text-foreground">
                        User Management
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {users.data.length} {users.data.length === 1 ? 'user' : 'users'}
                    </p>
                </div>
            }
        >
            <Head title="User Management" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex w-full md:w-auto items-center gap-2">
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        className="w-full md:w-64"
                                    />
                                    <Button size="icon" onClick={handleSearch}>
                                        <Search className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Last Active</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.map((user) => (
                                        <TableRow
                                            key={user.id}
                                            className={cn(user.id === authUser.id && 'bg-accent/60')}
                                        >
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">
                                                        {user.name} {user.id === authUser.id && '(You)'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getRoleBadgeClass(user.roles[0]?.name)}>
                                                    {user.roles[0]?.name || 'No Role'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.is_active ? (
                                                    <Badge className="border border-[#1E3A24] bg-[#132B1A] text-[#4ADE80] hover:bg-[#132B1A]">Active</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="border-[#5A2020]">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {user.last_login_at ? (
                                                    formatDistanceToNow(new Date(user.last_login_at)) + ' ago'
                                                ) : (
                                                    <span className="italic text-muted-foreground">No activity</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger disabled={user.id === authUser.id}>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => toggleStatus(user)}>
                                                            {user.is_active ? 'Deactivate Account' : 'Activate'}
                                                        </DropdownMenuItem>
                                                        <div className="my-1 h-px bg-border" />
                                                        <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Change Role</p>
                                                        {roles.map(role => (
                                                            <DropdownMenuItem 
                                                                key={role.id} 
                                                                onClick={() => updateRole(user, role.name)}
                                                                disabled={user.roles[0]?.name === role.name}
                                                            >
                                                                Change Role to {role.name}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
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
