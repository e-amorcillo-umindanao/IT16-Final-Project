import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { setPendingUpload } from '@/lib/pendingUpload';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Download,
    Eye,
    File,
    FileText,
    FileType,
    CalendarIcon,
    Image as ImageIcon,
    LockKeyhole,
    Loader2,
    MoreHorizontal,
    Plus,
    Search,
    Sheet,
    ShieldCheck,
    Share2,
    Star,
    Trash2,
    Upload,
    UploadCloud,
} from 'lucide-react';
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type DocumentItem = {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    is_starred: boolean;
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

function parseDateValue(value: string) {
    if (!value) {
        return undefined;
    }

    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function formatDateValue(date?: Date) {
    return date ? format(date, 'yyyy-MM-dd') : '';
}

function getTypeBadge(mimeType: string) {
    const map: Record<string, { label: string; className: string }> = {
        'application/pdf': {
            label: 'PDF',
            className: 'border-red-500/20 bg-red-500/15 text-red-600 dark:text-red-400',
        },
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
            label: 'DOCX',
            className: 'border-blue-500/20 bg-blue-500/15 text-blue-600 dark:text-blue-400',
        },
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
            label: 'XLSX',
            className: 'border-green-500/20 bg-green-500/15 text-green-700 dark:text-green-400',
        },
    };

    if (mimeType.startsWith('image/')) {
        return {
            label: 'IMAGE',
            className: 'border-purple-500/20 bg-purple-500/15 text-purple-600 dark:text-purple-400',
        };
    }

    return (
        map[mimeType] ?? {
            label: 'FILE',
            className: 'border-border bg-muted text-muted-foreground',
        }
    );
}

export default function Index({ documents, flash }: Props) {
    const [search, setSearch] = useState('');
    const [fileType, setFileType] = useState<FileFilter>('all');
    const [selected, setSelected] = useState<number[]>([]);
    const [bulkDownloading, setBulkDownloading] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
    const [shareDocument, setShareDocument] = useState<DocumentItem | null>(null);
    const [showStarredOnly, setShowStarredOnly] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const dragCounter = useRef(0);

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

    useEffect(() => {
        const currentDocumentIds = new Set(documents.data.map((document) => document.id));

        setSelected((current) => current.filter((id) => currentDocumentIds.has(id)));
    }, [documents.data]);

    const filteredDocuments = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return documents.data.filter((document) => {
            const matchesSearch =
                normalizedSearch.length === 0 ||
                document.original_name.toLowerCase().includes(normalizedSearch);

            const category = getFileCategory(document.mime_type);
            const matchesType = fileType === 'all' || category === fileType;
            const matchesStarred = !showStarredOnly || document.is_starred;

            return matchesSearch && matchesType && matchesStarred;
        });
    }, [documents.data, fileType, search, showStarredOnly]);

    const handleDragEnter = useCallback((event: DragEvent) => {
        event.preventDefault();
        dragCounter.current += 1;

        if (event.dataTransfer?.items?.length) {
            setIsDraggingOver(true);
        }
    }, []);

    const handleDragLeave = useCallback((event: DragEvent) => {
        event.preventDefault();
        dragCounter.current = Math.max(0, dragCounter.current - 1);

        if (dragCounter.current === 0) {
            setIsDraggingOver(false);
        }
    }, []);

    const handleDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
    }, []);

    const handleDrop = useCallback((event: DragEvent) => {
        event.preventDefault();
        dragCounter.current = 0;
        setIsDraggingOver(false);

        const file = event.dataTransfer?.files?.[0];

        if (file) {
            setPendingUpload(file);
            router.visit(route('documents.create'));
        }
    }, []);

    useEffect(() => {
        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        };
    }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

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

    const handleBulkDownload = async () => {
        if (selected.length === 0) {
            return;
        }

        const selectedIds = [...selected];

        setBulkDownloading(true);

        try {
            const csrfToken = document
                .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.getAttribute('content') ?? '';

            const response = await fetch(route('documents.bulk-download'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/octet-stream',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ ids: selectedIds }),
            });

            if (!response.ok) {
                throw new Error('Bulk download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = window.document.createElement('a');

            link.href = url;
            link.download = 'securevault-documents.zip';
            window.document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setSelected([]);
            toast.success(`${selectedIds.length} document(s) downloaded as ZIP.`);
        } catch {
            toast.error('Bulk download failed. Please try again.');
        } finally {
            setBulkDownloading(false);
        }
    };

    const handleBulkDelete = () => {
        if (selected.length === 0) {
            return;
        }

        const selectedIds = [...selected];

        router.delete(route('documents.bulk-delete'), {
            data: { ids: selectedIds },
            preserveScroll: true,
            onSuccess: (page) => {
                const inertiaPage = page as typeof page & { props: { flash?: { success?: string | null } } };

                if (inertiaPage.props.flash) {
                    inertiaPage.props.flash.success = null;
                }

                setSelected([]);
                toast.success(
                    selectedIds.length === 1
                        ? 'Document moved to trash.'
                        : 'Documents moved to trash.'
                );
            },
        });
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
    const visibleDocumentIds = filteredDocuments.map((document) => document.id);
    const allVisibleSelected =
        visibleDocumentIds.length > 0 &&
        visibleDocumentIds.every((id) => selected.includes(id));
    const someVisibleSelected = visibleDocumentIds.some((id) => selected.includes(id));
    const someSelected = selected.length > 0;

    const toggleSelect = (id: number) => {
        setSelected((current) =>
            current.includes(id)
                ? current.filter((selectedId) => selectedId !== id)
                : [...current, id]
        );
    };

    const toggleSelectAll = (checked: boolean) => {
        if (visibleDocumentIds.length === 0) {
            return;
        }

        setSelected((current) => {
            if (!checked) {
                return current.filter((id) => !visibleDocumentIds.includes(id));
            }

            return Array.from(new Set([...current, ...visibleDocumentIds]));
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold leading-tight text-foreground">My Vault</h2>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href="/dashboard">Main</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>My Vault</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
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
                                <Card className="flex w-full max-w-md flex-col items-center justify-center py-20">
                                    <CardContent className="flex flex-col items-center gap-4 text-center">
                                        <div className="relative rounded-xl bg-muted p-5">
                                            <LockKeyhole className="h-16 w-16 text-muted-foreground" />
                                            <div className="absolute -bottom-2 -right-2 rounded-full bg-primary p-1.5 text-primary-foreground">
                                                <ShieldCheck className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-foreground">Your vault is empty</h3>
                                            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                                                Upload and encrypt your first document to get started.
                                            </p>
                                        </div>
                                        <Link href={route('documents.create')}>
                                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                                                <Upload className="mr-2 h-4 w-4" />
                                                Upload Document
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
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
                                                    aria-label="Search documents"
                                                    className="bg-background pl-9"
                                                />
                                            </div>
                                            <div className="w-full sm:w-[220px]">
                                                <Select value={fileType} onValueChange={(value) => setFileType(value as FileFilter)}>
                                                    <SelectTrigger
                                                        className="w-40 bg-background"
                                                        aria-label="Filter documents by file type"
                                                    >
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
                                            <Button
                                                variant={showStarredOnly ? 'default' : 'outline'}
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => setShowStarredOnly((current) => !current)}
                                            >
                                                <Star className="h-3.5 w-3.5" />
                                                Starred
                                            </Button>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {filteredCount} {filteredCount === 1 ? 'document' : 'documents'}
                                        </p>
                                        <div aria-live="polite" aria-atomic="true" className="sr-only">
                                            {search.trim().length >= 2
                                                ? filteredCount > 0
                                                    ? `${filteredCount} search result${filteredCount !== 1 ? 's' : ''} found`
                                                    : 'No results found'
                                                : `Showing ${filteredCount} of ${documents.total} documents`}
                                        </div>
                                    </div>
                                </div>

                                {someSelected && (
                                    <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                        <span className="text-sm font-medium text-foreground">
                                            {selected.length} document{selected.length !== 1 ? 's' : ''} selected
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                disabled={bulkDownloading}
                                                onClick={handleBulkDownload}
                                            >
                                                {bulkDownloading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Download className="h-4 w-4" />
                                                )}
                                                Download ZIP
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Move to Trash
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            Move {selected.length} document(s) to Trash?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            These documents will be permanently deleted after 30 days. You can restore them from the Trash page.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={handleBulkDelete}
                                                        >
                                                            Move to Trash
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="overflow-hidden rounded-xl border border-border bg-card">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="w-12">
                                                    <Checkbox
                                                        checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
                                                        onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                                                        aria-label="Select all visible documents"
                                                    />
                                                </TableHead>
                                                <TableHead className="w-14">Star</TableHead>
                                                <TableHead>File</TableHead>
                                                <TableHead>Size</TableHead>
                                                <TableHead>Uploaded</TableHead>
                                                <TableHead>Integrity</TableHead>
                                                <TableHead className="w-[72px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredDocuments.length > 0 ? (
                                                filteredDocuments.map((document) => {
                                                    const typeBadge = getTypeBadge(document.mime_type);

                                                    return (
                                                    <TableRow key={document.id} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selected.includes(document.id)}
                                                                onCheckedChange={() => toggleSelect(document.id)}
                                                                onClick={(event) => event.stopPropagation()}
                                                                aria-label={`Select ${document.original_name}`}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                aria-label={document.is_starred ? 'Unstar document' : 'Star document'}
                                                                onClick={() =>
                                                                    router.patch(route('documents.star', document.id), {}, { preserveScroll: true })
                                                                }
                                                            >
                                                                <Star
                                                                    className={`h-4 w-4 transition-colors ${
                                                                        document.is_starred
                                                                            ? 'fill-primary text-primary'
                                                                            : 'text-muted-foreground hover:text-primary'
                                                                    }`}
                                                                />
                                                            </Button>
                                                        </TableCell>
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
                                                                    <Badge variant="outline" className={typeBadge.className}>
                                                                        {typeBadge.label}
                                                                    </Badge>
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
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="cursor-help gap-1 border-green-500/20 bg-green-500/15 text-green-700 dark:text-green-400"
                                                                    >
                                                                        <ShieldCheck className="h-3 w-3" />
                                                                        Verified
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>SHA-256 hash verified on last download</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-muted-foreground hover:bg-muted"
                                                                        aria-label={`Document actions for ${document.original_name}`}
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
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        View Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDownload(document.id)}>
                                                                        <Download className="mr-2 h-4 w-4" />
                                                                        Download
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => setShareDocument(document)}>
                                                                        <Share2 className="mr-2 h-4 w-4" />
                                                                        Share
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                                        onClick={() => setDocumentToDelete(document)}
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Move to Trash
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                    );
                                                })
                                            ) : (
                                                <TableRow className="hover:bg-transparent">
                                                    <TableCell colSpan={7} className="h-32 text-center">
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
                                        <p className="text-sm text-muted-foreground">
                                            Page {documents.current_page} of {documents.last_page}
                                        </p>
                                        <Pagination className="mx-0 w-auto justify-end">
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href={documents.prev_page_url ?? '#'}
                                                        className={!documents.prev_page_url ? 'pointer-events-none opacity-50' : ''}
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            goToPage(documents.prev_page_url);
                                                        }}
                                                    />
                                                </PaginationItem>
                                                {documents.links.slice(1, -1).map((link, index) => (
                                                    <PaginationItem key={`${link.label}-${index}`}>
                                                        {link.label === '...' ? (
                                                            <PaginationEllipsis />
                                                        ) : (
                                                            <PaginationLink
                                                                href={link.url ?? '#'}
                                                                isActive={link.active}
                                                                onClick={(event) => {
                                                                    event.preventDefault();
                                                                    goToPage(link.url);
                                                                }}
                                                            >
                                                                {link.label}
                                                            </PaginationLink>
                                                        )}
                                                    </PaginationItem>
                                                ))}
                                                <PaginationItem>
                                                    <PaginationNext
                                                        href={documents.next_page_url ?? '#'}
                                                        className={!documents.next_page_url ? 'pointer-events-none opacity-50' : ''}
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            goToPage(documents.next_page_url);
                                                        }}
                                                    />
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </TooltipProvider>

            {isDraggingOver && (
                <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/20 backdrop-blur-sm">
                    <div className="rounded-2xl border-2 border-dashed border-primary bg-card px-16 py-12 text-center shadow-2xl">
                        <UploadCloud className="mx-auto mb-4 h-16 w-16 text-primary" />
                        <h3 className="text-xl font-semibold text-foreground">Drop to Upload</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Release to go to the upload page</p>
                    </div>
                </div>
            )}

            <Dialog open={shareDocument !== null} onOpenChange={(open) => !open && setShareDocument(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Share Document</DialogTitle>
                        <DialogDescription>
                            {shareDocument
                                ? `Grant access to "${shareDocument.original_name}" for a registered SecureVault user.`
                                : 'Grant access to a registered SecureVault user.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleShareSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="share-email">Email</Label>
                            <Input
                                id="share-email"
                                type="email"
                                placeholder="collaborator@example.com"
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
                                    <SelectValue placeholder="Select permission" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="view_only">View Only</SelectItem>
                                    <SelectItem value="download">Download</SelectItem>
                                    <SelectItem value="full_access">Full Access</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="share-expiry">Expiry Date <span className="text-xs text-muted-foreground">(optional)</span></Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="share-expiry"
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start bg-background text-left font-normal"
                                    >
                                        <CalendarIcon className="h-4 w-4" />
                                        {data.expires_at
                                            ? format(parseDateValue(data.expires_at) ?? new Date(), 'PPP')
                                            : 'No expiry'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={parseDateValue(data.expires_at)}
                                        onSelect={(date) => setData('expires_at', formatDateValue(date))}
                                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                    />
                                </PopoverContent>
                            </Popover>
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
                                {processing ? 'Sharing...' : 'Grant Access'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={documentToDelete !== null} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {documentToDelete
                                ? `"${documentToDelete.original_name}" will be permanently deleted after 30 days. You can restore it from the Trash page within that window.`
                                : 'This document will be permanently deleted after 30 days. You can restore it from the Trash page within that window.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDelete}
                        >
                            Move to Trash
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AuthenticatedLayout>
    );
}
