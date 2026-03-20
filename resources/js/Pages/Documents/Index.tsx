import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    Download,
    Eye,
    File,
    FileText,
    FileType,
    Image as ImageIcon,
    LockKeyhole,
    MoreHorizontal,
    Plus,
    Search,
    Sheet,
    ShieldCheck,
    Share2,
    Trash2,
    Upload,
} from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type DocumentItem = {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    created_at: string;
};

type FileFilter = 'all' | 'pdf' | 'word' | 'excel' | 'image';

interface Props extends PageProps {
    documents: PaginatedResponse<DocumentItem>;
}

const FILE_TYPE_OPTIONS: Array<{ value: FileFilter; label: string }> = [
    { value: 'all', label: 'All Types' },
    { value: 'pdf', label: 'PDF' },
    { value: 'word', label: 'Word (DOCX)' },
    { value: 'excel', label: 'Excel (XLSX)' },
    { value: 'image', label: 'Image (PNG/JPG)' },
];

function getFileCategory(mimeType: string): FileFilter | 'other' {
    const normalized = mimeType.toLowerCase();

    if (normalized.includes('pdf')) return 'pdf';
    if (
        normalized.includes('word') ||
        normalized.includes('officedocument.wordprocessingml.document') ||
        normalized.includes('msword')
    ) {
        return 'word';
    }
    if (
        normalized.includes('sheet') ||
        normalized.includes('excel') ||
        normalized.includes('spreadsheetml')
    ) {
        return 'excel';
    }
    if (
        normalized.includes('image/png') ||
        normalized.includes('image/jpeg') ||
        normalized.includes('image/jpg')
    ) {
        return 'image';
    }

    return 'other';
}

function getFileIcon(mimeType: string): ReactNode {
    switch (getFileCategory(mimeType)) {
        case 'pdf':
            return <FileText className="h-5 w-5 text-primary" />;
        case 'word':
            return <FileType className="h-5 w-5 text-primary" />;
        case 'excel':
            return <Sheet className="h-5 w-5 text-primary" />;
        case 'image':
            return <ImageIcon className="h-5 w-5 text-primary" />;
        default:
            return <File className="h-5 w-5 text-primary" />;
    }
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Index({ documents, flash }: Props) {
    const [search, setSearch] = useState('');
    const [fileType, setFileType] = useState<FileFilter>('all');
    const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
    const [shareDocument, setShareDocument] = useState<DocumentItem | null>(null);

    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm({
        email: '',
        permission: 'view_only' as 'view_only' | 'download' | 'full_access',
        expires_at: '',
    });

    useEffect(() => {
        if (shareDocument) {
            clearErrors();
            reset();
        }
    }, [shareDocument, clearErrors, reset]);

    const filteredDocuments = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return documents.data.filter((document) => {
            const matchesSearch =
                normalizedSearch.length === 0 ||
                document.original_name.toLowerCase().includes(normalizedSearch);

            const category = getFileCategory(document.mime_type);
            const matchesType = fileType === 'all' || category === fileType;

            return matchesSearch && matchesType;
        });
    }, [documents.data, fileType, search]);

    const handleDelete = () => {
        if (!documentToDelete) {
            return;
        }

        router.delete(route('documents.destroy', documentToDelete.id), {
            preserveScroll: true,
            onFinish: () => setDocumentToDelete(null),
        });
    };

    const handleDownload = (documentId: number) => {
        window.location.assign(route('documents.download', documentId));
    };

    const handleShareSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!shareDocument) {
            return;
        }

        post(route('shares.store', shareDocument.id), {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                const inertiaPage = page as typeof page & { props: { flash?: { success?: string | null } } };

                if (inertiaPage.props.flash) {
                    inertiaPage.props.flash.success = null;
                }

                toast.success('Document shared successfully.');
                setShareDocument(null);
                reset();
            },
        });
    };

    const goToPage = (url: string | null) => {
        if (!url) {
            return;
        }

        router.get(url, {}, { preserveScroll: true, preserveState: true });
    };

    const totalDocuments = documents.total;
    const filteredCount = filteredDocuments.length;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold leading-tight text-foreground">My Vault</h2>
                        <p className="text-sm text-muted-foreground">Main &#8250; My Vault</p>
                    </div>
                    <Link href={route('documents.create')} className="shrink-0">
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" />
                            Upload Document
                        </Button>
                    </Link>
                </div>
            }
        >
            <Head title="My Vault" />

            <TooltipProvider>
                <div className="py-10">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {totalDocuments === 0 ? (
                            <div className="flex min-h-[calc(100vh-18rem)] items-center justify-center">
                                <div className="flex max-w-md flex-col items-center text-center">
                                    <div className="relative mb-6">
                                        <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-muted">
                                            <LockKeyhole className="h-16 w-16 text-primary" />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                                            <ShieldCheck className="h-6 w-6" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-semibold text-foreground">Your vault is empty</h3>
                                    <p className="mt-3 max-w-sm text-center text-sm text-muted-foreground">
                                        Upload and encrypt your first document to get started.
                                    </p>
                                    <Link href={route('documents.create')} className="mt-6">
                                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                                            <Upload className="mr-2 h-4 w-4" />
                                            Upload Document
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
                                            <div className="relative w-full sm:max-w-sm">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    value={search}
                                                    onChange={(event) => setSearch(event.target.value)}
                                                    placeholder="Search documents..."
                                                    className="bg-background pl-9"
                                                />
                                            </div>
                                            <div className="w-full sm:w-[220px]">
                                                <Select value={fileType} onValueChange={(value) => setFileType(value as FileFilter)}>
                                                    <SelectTrigger className="bg-background">
                                                        <SelectValue placeholder="All Types" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {FILE_TYPE_OPTIONS.map((option) => (
                                                            <SelectItem key={option.value} value={option.value}>
                                                                {option.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {filteredCount} {filteredCount === 1 ? 'document' : 'documents'}
                                        </p>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-border bg-card">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>File</TableHead>
                                                <TableHead>Size</TableHead>
                                                <TableHead>Uploaded</TableHead>
                                                <TableHead>Integrity</TableHead>
                                                <TableHead className="w-[72px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredDocuments.length > 0 ? (
                                                filteredDocuments.map((document) => (
                                                    <TableRow key={document.id} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                                    {getFileIcon(document.mime_type)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p
                                                                        className="truncate font-medium text-foreground"
                                                                        title={document.original_name}
                                                                    >
                                                                        {document.original_name}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {document.mime_type}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {formatBytes(document.file_size)}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {formatDistanceToNow(new Date(document.created_at), {
                                                                addSuffix: true,
                                                            })}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <span className="inline-flex items-center text-status-success">
                                                                        <ShieldCheck className="h-5 w-5" />
                                                                    </span>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Verified</TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-muted-foreground hover:bg-muted"
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                        <span className="sr-only">Open actions</span>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem
                                                                        onClick={() =>
                                                                            router.get(route('documents.show', document.id))
                                                                        }
                                                                    >
                                                                        <Eye className="h-4 w-4" />
                                                                        View Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDownload(document.id)}>
                                                                        <Download className="h-4 w-4" />
                                                                        Download
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => setShareDocument(document)}>
                                                                        <Share2 className="h-4 w-4" />
                                                                        Share
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                                        onClick={() => setDocumentToDelete(document)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        Move to Trash
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow className="hover:bg-transparent">
                                                    <TableCell colSpan={5} className="h-32 text-center">
                                                        <div className="space-y-1">
                                                            <p className="font-medium text-foreground">No matching documents</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Try adjusting your search or file type filter.
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {documents.total > 15 && (
                                    <div className="flex items-center justify-between gap-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => goToPage(documents.prev_page_url)}
                                            disabled={!documents.prev_page_url}
                                        >
                                            Previous
                                        </Button>
                                        <p className="text-sm text-muted-foreground">
                                            Page {documents.current_page} of {documents.last_page}
                                        </p>
                                        <Button
                                            variant="outline"
                                            onClick={() => goToPage(documents.next_page_url)}
                                            disabled={!documents.next_page_url}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </TooltipProvider>

            <Dialog open={shareDocument !== null} onOpenChange={(open) => !open && setShareDocument(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share Document</DialogTitle>
                        <DialogDescription>
                            {shareDocument
                                ? `Share "${shareDocument.original_name}" with another user.`
                                : 'Share this document with another user.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleShareSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="share-email">Email</Label>
                            <Input
                                id="share-email"
                                type="email"
                                placeholder="Enter recipient email..."
                                value={data.email}
                                onChange={(event) => setData('email', event.target.value)}
                                className="bg-background"
                                required
                            />
                            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="share-permission">Permission</Label>
                            <Select
                                value={data.permission}
                                onValueChange={(value) =>
                                    setData('permission', value as 'view_only' | 'download' | 'full_access')
                                }
                            >
                                <SelectTrigger id="share-permission" className="bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="view_only">View Only</SelectItem>
                                    <SelectItem value="download">Download</SelectItem>
                                    <SelectItem value="full_access">Full Access</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="share-expiry">Expiry Date (Optional)</Label>
                            <Input
                                id="share-expiry"
                                type="date"
                                value={data.expires_at}
                                onChange={(event) => setData('expires_at', event.target.value)}
                                className="bg-background"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        {errors.expires_at && <p className="text-sm text-destructive">{errors.expires_at}</p>}
                        {errors.permission && <p className="text-sm text-destructive">{errors.permission}</p>}
                        {flash?.error && !errors.email && <p className="text-sm text-destructive">{flash.error}</p>}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShareDocument(null)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                            >
                                {processing ? 'Sharing...' : 'Share Document'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={documentToDelete !== null} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Move to Trash</DialogTitle>
                        <DialogDescription>
                            {documentToDelete
                                ? `Are you sure you want to move "${documentToDelete.original_name}" to trash?`
                                : 'Are you sure you want to move this document to trash?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDocumentToDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="hover:bg-destructive/90"
                            onClick={handleDelete}
                        >
                            Move to Trash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
