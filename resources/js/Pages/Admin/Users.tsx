import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Search, Shield, UserX, UserCheck, ShieldCheck } from 'lucide-react';
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
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    User Management
                </h2>
            }
        >
            <Head title="User Management" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <CardTitle className="text-sm font-medium uppercase tracking-wider text-gray-500">
                                    Registered Users
                                </CardTitle>
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
                                        <TableRow key={user.id} className={user.id === authUser.id ? 'bg-gray-50/50' : ''}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">
                                                        {user.name} {user.id === authUser.id && '(You)'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                    {user.roles[0]?.name || 'No Role'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.is_active ? (
                                                    <Badge className="bg-green-100 text-green-700 border-green-200 border hover:bg-green-100">Active</Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="border-red-200">Inactive</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-gray-500">
                                                {user.last_login_at ? formatDistanceToNow(new Date(user.last_login_at)) + ' ago' : 'Never'}
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
                                                            {user.is_active ? (
                                                                <div className="flex items-center text-red-600">
                                                                    <UserX className="mr-2 h-4 w-4" /> Deactivate
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center text-green-600">
                                                                    <UserCheck className="mr-2 h-4 w-4" /> Activate
                                                                </div>
                                                            )}
                                                        </DropdownMenuItem>
                                                        <div className="h-px bg-gray-100 my-1" />
                                                        <p className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Change Role</p>
                                                        {roles.map(role => (
                                                            <DropdownMenuItem 
                                                                key={role.id} 
                                                                onClick={() => updateRole(user, role.name)}
                                                                disabled={user.roles[0]?.name === role.name}
                                                            >
                                                                <ShieldCheck className="mr-2 h-4 w-4 text-indigo-500" /> {role.name}
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
