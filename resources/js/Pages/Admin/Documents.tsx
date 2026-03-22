import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import GravatarAvatar from '@/components/GravatarAvatar';
import { format } from 'date-fns';
import { Lock, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AdminDocument {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    created_at: string;
    encryption_iv: string | null;
    user: {
        name: string;
        email: string;
        avatar_url: string | null;
    };
}

interface Props {
    documents: {
        data: AdminDocument[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
        last_page: number;
    };
    filters: {
        search?: string;
    };
}

export default function AdminDocuments({ documents, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search !== (filters.search || '')) {
                router.get(route('admin.documents'), { search }, {
                    preserveState: true,
                    replace: true,
                });
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';

        const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const power = Math.floor(Math.log(bytes) / Math.log(1024));
        const value = bytes / Math.pow(1024, power);

        return `${value >= 10 ? value.toFixed(0) : value.toFixed(2)} ${units[power]}`;
    };

    const getFileTypeLabel = (mimeType: string) => {
        if (mimeType.includes('pdf')) return 'PDF';
        if (mimeType.includes('word') || mimeType.includes('officedocument.word') || mimeType.includes('msword')) return 'Word Document';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Spreadsheet';
        if (mimeType.includes('image')) return 'Image';
        if (mimeType.includes('video')) return 'Video';
        return 'File';
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-foreground">
                            All Documents
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Read-only audit view of all uploaded documents
                        </p>
                    </div>
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                            placeholder="Search by document or owner..."
                            aria-label="Search documents by document name or owner"
                        />
                    </div>
                </div>
            }
        >
            <Head title="All Documents" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {documents.total} {documents.total === 1 ? 'document' : 'documents'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document Name</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Uploaded Date</TableHead>
                                        <TableHead>Encryption Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                                                No documents matched your search.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.data.map((document) => (
                                            <TableRow key={document.id}>
                                                <TableCell className="font-medium text-foreground">
                                                    {document.original_name}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">{document.user.name}</span>
                                                        <span className="text-xs text-muted-foreground">{document.user.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {getFileTypeLabel(document.mime_type)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatBytes(document.file_size)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(document.created_at), 'MMM d, yyyy')}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="border-status-success/30 bg-status-success/15 text-status-success">
                                                        <Lock className="mr-1 h-3 w-3" />
                                                        {document.encryption_iv ? 'Encrypted' : 'Unknown'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
