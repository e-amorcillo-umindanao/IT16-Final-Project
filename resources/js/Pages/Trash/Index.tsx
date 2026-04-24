import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { getExpiryBadge } from '@/lib/trashExpiryBadge';
import { PaginatedResponse } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    File,
    FileText,
    FileType,
    Image as ImageIcon,
    Info,
    RotateCcw,
    Search,
    Sheet,
    Trash2,
    X,
} from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

interface TrashDocument {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    deleted_at: string;
    deleted_at_human: string;
}

interface Props {
    documents: PaginatedResponse<TrashDocument>;
    search: string;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes.toFixed(2)} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(mimeType: string) {
    const normalized = mimeType.toLowerCase();

    if (normalized.includes('pdf')) return <FileText className="h-5 w-5 text-muted-foreground" />;
    if (
        normalized.includes('word') ||
        normalized.includes('officedocument.wordprocessingml.document') ||
        normalized.includes('msword')
    ) {
        return <FileType className="h-5 w-5 text-muted-foreground" />;
    }
    if (
        normalized.includes('sheet') ||
        normalized.includes('excel') ||
        normalized.includes('spreadsheetml')
    ) {
        return <Sheet className="h-5 w-5 text-muted-foreground" />;
    }
    if (
        normalized.includes('image/jpeg') ||
        normalized.includes('image/jpg') ||
        normalized.includes('image/png') ||
        normalized.includes('image/webp')
    ) {
        return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
    }

    return <File className="h-5 w-5 text-muted-foreground" />;
}

function ExpiryStatus({ deletedAt }: { deletedAt: string }) {
    const expiry = getExpiryBadge(deletedAt);

    return (
        <Badge variant="outline" className={`text-xs font-medium ${expiry.className}`}>
            {expiry.label}
        </Badge>
    );
}

function TrashPagination({ documents }: { documents: PaginatedResponse<TrashDocument> }) {
    const goToPage = (url: string | null) => {
        if (!url) {
            return;
        }

        router.get(url, {}, { preserveScroll: true, preserveState: true });
    };

    return (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
                Showing {documents.from ?? 0}-{documents.to ?? 0} of {documents.total} deleted files
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
    );
}

export default function TrashIndex({ documents, search }: Props) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [isRestoringSelected, setIsRestoringSelected] = useState(false);
    const [searchValue, setSearchValue] = useState(search);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const allSelected = useMemo(
        () => documents.data.length > 0 && selectedIds.length === documents.data.length,
        [documents.data.length, selectedIds.length]
    );

    const toggleAll = (checked: boolean) => {
        setSelectedIds(checked ? documents.data.map((document) => document.id) : []);
    };

    const toggleOne = (documentId: number, checked: boolean) => {
        setSelectedIds((current) =>
            checked ? [...current, documentId] : current.filter((id) => id !== documentId)
        );
    };

    useEffect(() => {
        setSearchValue(search);
    }, [search]);

    useEffect(() => {
        const currentIds = new Set(documents.data.map((document) => document.id));

        setSelectedIds((current) => current.filter((id) => currentIds.has(id)));
    }, [documents.data]);

    useEffect(() => () => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
    }, []);

    const runSearch = (value: string) => {
        router.get(
            route('documents.trash'),
            value ? { search: value } : {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const queueSearch = (value: string) => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            runSearch(value);
        }, 300);
    };

    const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;

        setSearchValue(value);
        queueSearch(value);
    };

    const clearSearch = () => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        setSearchValue('');
        runSearch('');
    };

    const handleRestore = (id: number) => {
        setProcessingId(id);
        router.post(route('documents.restore', id), {}, {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
        });
    };

    const handleRestoreSelected = () => {
        if (selectedIds.length === 0) {
            return;
        }

        setIsRestoringSelected(true);
        router.post(
            route('documents.restore-selected'),
            { ids: selectedIds },
            {
                preserveScroll: true,
                onFinish: () => setIsRestoringSelected(false),
            }
        );
    };

    const handlePermanentDelete = (id: number) => {
        setProcessingId(id);
        router.delete(route('documents.force-delete', id), {
            preserveScroll: true,
            onFinish: () => {
                setProcessingId(null);
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="w-full space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">Trash</h2>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/dashboard">Main</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Trash</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Trash" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Alert className="border-l-4 border-l-primary bg-primary/5">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-sm font-semibold text-foreground">Notice</AlertTitle>
                        <AlertDescription className="text-sm text-muted-foreground">
                            Documents in the trash will be permanently deleted after 30 days. No recovery is possible after that period.
                        </AlertDescription>
                    </Alert>

                    <Separator className="my-6" />

                    {(documents.total > 0 || searchValue !== '' || search !== '') && (
                        <div className="relative w-full max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchValue}
                                onChange={handleSearch}
                                placeholder="Search deleted files..."
                                className="pl-9 pr-9"
                                aria-label="Search deleted files"
                            />
                            {searchValue && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                                    aria-label="Clear search"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    )}

                    {documents.data.length === 0 && !search ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                            <Trash2 className="mb-4 h-10 w-10 opacity-20" />
                            <p className="text-sm font-medium">Your trash is empty</p>
                            <p className="mt-1 text-xs opacity-70">
                                Deleted files appear here for 30 days before being permanently removed.
                            </p>
                        </div>
                    ) : documents.data.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No deleted files match <span className="font-medium">"{search}"</span>.
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-border bg-card">
                            <Table>
                                <TableHeader className="bg-background [&_tr]:border-border">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="w-10">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={(checked) => toggleAll(checked === true)}
                                                aria-label="Select all documents in trash"
                                            />
                                        </TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Deleted On</TableHead>
                                        <TableHead>Expires In</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.data.map((document) => (
                                        <TableRow key={document.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(document.id)}
                                                    onCheckedChange={(checked) => toggleOne(document.id, checked === true)}
                                                    aria-label={`Select ${document.original_name}`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {getFileIcon(document.mime_type)}
                                                    <span
                                                        className="max-w-[320px] truncate font-medium text-foreground"
                                                        title={document.original_name}
                                                    >
                                                        {document.original_name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatBytes(document.file_size)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {document.deleted_at_human}
                                            </TableCell>
                                            <TableCell>
                                                <ExpiryStatus deletedAt={document.deleted_at} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <AlertDialog>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="gap-1.5"
                                                                            disabled={processingId === document.id}
                                                                            aria-label={`Restore ${document.original_name}`}
                                                                        >
                                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                                            Restore
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Restore to My Vault</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Restore this document?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    "{document.original_name}" will be moved back to your vault.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleRestore(document.id)}>
                                                                    Restore
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="gap-1.5 text-destructive hover:bg-destructive/10"
                                                                disabled={processingId === document.id}
                                                                aria-label={`Delete ${document.original_name} permanently`}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Delete Permanently
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Permanently delete this document?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    "{document.original_name}" will be permanently deleted and cannot be recovered.
                                                                    This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    onClick={() => handlePermanentDelete(document.id)}
                                                                >
                                                                    Delete Forever
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter className="bg-background">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableCell colSpan={6}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">
                                                    {selectedIds.length > 0
                                                        ? `${selectedIds.length} selected`
                                                        : `${documents.total} item(s) in trash`}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    {selectedIds.length > 0 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="gap-1.5 text-sm"
                                                            onClick={handleRestoreSelected}
                                                            disabled={isRestoringSelected}
                                                            aria-label={`Restore ${selectedIds.length} selected document${selectedIds.length !== 1 ? 's' : ''}`}
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                            Restore Selected
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                            {documents.last_page > 1 && <TrashPagination documents={documents} />}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
