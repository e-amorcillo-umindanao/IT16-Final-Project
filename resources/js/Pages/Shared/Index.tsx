import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { FileIcon, Shield, User } from 'lucide-react';

interface Share {
    id: number;
    permission: 'view_only' | 'download' | 'full_access';
    expires_at: string | null;
    created_at: string;
    document: {
        id: number;
        original_name: string;
        user: {
            name: string;
        };
    };
    shared_by: {
        name: string;
    };
}

interface Props {
    shares: {
        data: Share[];
        links: any[];
    };
}

export default function SharedWithMe({ shares }: Props) {
    const getPermissionBadge = (permission: string) => {
        switch (permission) {
            case 'view_only':
                return <Badge variant="secondary" className="bg-gray-100 text-gray-700">View Only</Badge>;
            case 'download':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-700">Download</Badge>;
            case 'full_access':
                return <Badge variant="secondary" className="bg-green-100 text-green-700">Full Access</Badge>;
            default:
                return <Badge variant="outline">{permission}</Badge>;
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Shared with Me
                </h2>
            }
        >
            <Head title="Shared Documents" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[400px]">Document</TableHead>
                                        <TableHead>Shared By</TableHead>
                                        <TableHead>Permission</TableHead>
                                        <TableHead>Expires</TableHead>
                                        <TableHead>Received</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {shares.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <Shield className="mb-4 h-12 w-12 opacity-10" />
                                                    <p className="text-lg font-medium">No documents shared with you</p>
                                                    <p className="text-sm">When someone shares a vault item, it will appear here.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        shares.data.map((share) => (
                                            <TableRow 
                                                key={share.id} 
                                                className="cursor-pointer hover:bg-gray-50/50"
                                                onClick={() => router.get(route('documents.show', share.document.id))}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <FileIcon className="h-5 w-5 text-indigo-500" />
                                                        <span className="font-medium text-gray-900 truncate max-w-[300px]" title={share.document.original_name}>
                                                            {share.document.original_name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <User className="h-3.5 w-3.5" />
                                                        {share.shared_by.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getPermissionBadge(share.permission)}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {share.expires_at ? format(new Date(share.expires_at), 'MMM d, yyyy') : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-500">
                                                    {format(new Date(share.created_at), 'MMM d, yyyy')}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {shares.links && shares.links.length > 3 && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                             {/* Pagination handled by generic library/component if exist, 
                                 otherwise simple link list as in Index.tsx */}
                            {shares.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`px-3 py-1 rounded border text-sm ${
                                        link.active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50'
                                    } ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
