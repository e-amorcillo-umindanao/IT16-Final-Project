import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { FileIcon, FileSpreadsheet, FileText, FileVideo, ImageIcon, Lock, MoreVertical, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Document {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    created_at: string;
}

interface Props {
    documents: {
        data: Document[];
        links: any[];
        current_page: number;
        last_page: number;
    };
    filters: {
        search?: string;
    };
}

export default function Index({ documents, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (search !== (filters.search || '')) {
                router.get(route('documents.index'), { search }, {
                    preserveState: true,
                    replace: true,
                });
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [search]);

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
        if (mimeType.includes('word') || mimeType.includes('officedocument.word') || mimeType.includes('msword')) return <FileText className="h-5 w-5 text-blue-500" />;
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
        if (mimeType.includes('image')) return <ImageIcon className="h-5 w-5 text-purple-500" />;
        if (mimeType.includes('video')) return <FileVideo className="h-5 w-5 text-orange-500" />;
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        My Vault
                    </h2>
                    <Link href={route('documents.create')}>
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="mr-2 h-4 w-4" /> Upload Document
                        </Button>
                    </Link>
                </div>
            }
        >
            <Head title="Documents" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between gap-4">
                        <div className="relative w-full max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search documents..."
                                className="pl-10"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[400px]">Name</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Uploaded</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <FileIcon className="mb-4 h-12 w-12 opacity-20" />
                                                    <p className="text-lg font-medium">No documents found</p>
                                                    <p className="text-sm">Upload your first document to get started.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.data.map((doc) => (
                                            <TableRow key={doc.id} className="cursor-pointer hover:bg-gray-50/50" onClick={() => router.get(route('documents.show', doc.id))}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        {getFileIcon(doc.mime_type)}
                                                        <span className="font-medium text-gray-900 truncate max-w-[300px]" title={doc.original_name}>
                                                            {doc.original_name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-600 text-sm">
                                                    {formatBytes(doc.file_size)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 px-2">
                                                        <Lock className="h-3 w-3" /> Encrypted
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-gray-600 text-sm">
                                                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={route('documents.show', doc.id)} onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {documents.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                            {documents.links.map((link, i) => (
                                <Button
                                    key={i}
                                    variant={link.active ? 'default' : 'outline'}
                                    disabled={!link.url}
                                    onClick={() => router.get(link.url)}
                                    className="h-8 w-8 p-0"
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
