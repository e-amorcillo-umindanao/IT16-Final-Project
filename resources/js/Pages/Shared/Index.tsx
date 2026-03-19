import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { FileIcon, Shield, User, Share2 } from 'lucide-react';

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
                return <Badge variant="secondary" className="bg-secondary text-muted-foreground">View Only</Badge>;
            case 'download':
                return <Badge variant="secondary" className="bg-[#0F1B2D] text-[#60A5FA]">Download</Badge>;
            case 'full_access':
                return <Badge variant="secondary" className="bg-[#132B1A] text-[#4ADE80]">Full Access</Badge>;
            default:
                return <Badge variant="outline">{permission}</Badge>;
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-semibold leading-tight text-foreground">
                        Shared with Me
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Documents others have shared with you
                    </p>
                </div>
            }
        >
            <Head title="Shared Documents" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {shares.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-32 text-muted-foreground">
                            <Share2 className="mb-6 h-16 w-16 text-primary/60" />
                            <h3 className="mb-2 text-xl font-bold text-foreground">Nothing shared with you yet</h3>
                            <p className="text-sm max-w-sm text-center">When someone shares a document, it will appear here.</p>
                        </div>
                    ) : (
                        <Card className="overflow-hidden">
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
                                        {shares.data.map((share) => (
                                            <TableRow 
                                                key={share.id} 
                                                className="cursor-pointer"
                                                onClick={() => router.get(route('documents.show', share.document.id))}
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <FileIcon className="h-5 w-5 text-primary" />
                                                        <span className="max-w-[300px] truncate font-medium text-foreground" title={share.document.original_name}>
                                                            {share.document.original_name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <User className="h-3.5 w-3.5" />
                                                        {share.shared_by.name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getPermissionBadge(share.permission)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {share.expires_at ? format(new Date(share.expires_at), 'MMM d, yyyy') : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(share.created_at), 'MMM d, yyyy')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {shares.links && shares.links.length > 3 && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                             {/* Pagination handled by generic library/component if exist, 
                                 otherwise simple link list as in Index.tsx */}
                            {shares.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    className={`px-3 py-1 rounded border text-sm ${
                                        link.active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
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
