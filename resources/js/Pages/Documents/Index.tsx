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
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    FileIcon,
    FileSpreadsheet,
    FileText,
    FileVideo,
    ImageIcon,
    MoreVertical,
    Plus,
    Search,
    UploadCloud,
} from 'lucide-react';
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
    const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

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
        if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-[#F87171]" />;
        if (mimeType.includes('word') || mimeType.includes('officedocument.word') || mimeType.includes('msword')) return <FileText className="h-5 w-5 text-[#60A5FA]" />;
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileSpreadsheet className="h-5 w-5 text-[#4ADE80]" />;
        if (mimeType.includes('image')) return <ImageIcon className="h-5 w-5 text-primary" />;
        if (mimeType.includes('video')) return <FileVideo className="h-5 w-5 text-[#F59E0B]" />;
        return <FileIcon className="h-5 w-5 text-muted-foreground" />;
    };

    const getFileTypeLabel = (mimeType: string) => {
        if (mimeType.includes('pdf')) return 'PDF';
        if (mimeType.includes('word') || mimeType.includes('officedocument.word') || mimeType.includes('msword')) return 'Word Document';
        if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Spreadsheet';
        if (mimeType.includes('image')) return 'Image';
        if (mimeType.includes('video')) return 'Video';
        return 'File';
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const confirmDelete = () => {
        if (!documentToDelete) return;

        router.delete(route('documents.destroy', documentToDelete.id), {
            onFinish: () => setDocumentToDelete(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-foreground">
                        My Vault
                    </h2>
                    <div className="relative w-full max-w-md sm:mx-4">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search documents..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Link href={route('documents.create')} className="shrink-0">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Upload Document
                        </Button>
                    </Link>
                </div>
            }
        >
            <Head title="Documents" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {documents.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-32 text-muted-foreground">
                            <UploadCloud className="mb-6 h-16 w-16 text-primary/60" />
                            <h3 className="mb-2 text-xl font-bold text-foreground">Your vault is empty</h3>
                            <p className="mb-6 max-w-sm text-center text-sm">Upload your first document to get started.</p>
                            <Link href={route('documents.create')}>
                                <Button className="px-6">
                                    <Plus className="mr-2 h-4 w-4" /> Upload Document
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <Card className="overflow-hidden">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[400px]">Name</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead>Uploaded</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documents.data.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell>
                                                    <Link
                                                        href={route('documents.show', doc.id)}
                                                        className="block max-w-[300px] truncate font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                                                        title={doc.original_name}
                                                    >
                                                        {doc.original_name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {getFileIcon(doc.mime_type)}
                                                        <span className="text-sm text-muted-foreground">
                                                            {getFileTypeLabel(doc.mime_type)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatBytes(doc.file_size)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="text-muted-foreground">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => router.get(route('documents.show', doc.id))}>
                                                                View Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => window.location.assign(route('documents.download', doc.id))}>
                                                                Download
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="text-[#F87171] focus:text-[#F87171]"
                                                                onClick={() => setDocumentToDelete(doc)}
                                                            >
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

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

            <Dialog open={documentToDelete !== null} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Document</DialogTitle>
                        <DialogDescription>
                            {documentToDelete
                                ? `Are you sure you want to move "${documentToDelete.original_name}" to trash?`
                                : 'Are you sure you want to move this document to trash?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDocumentToDelete(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
