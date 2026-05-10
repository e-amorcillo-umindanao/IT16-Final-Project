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
import { Head, router } from '@inertiajs/react';
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

    if (normalized.includes('pdf')) return <FileText className="h-5 w-5 text-amber-700" />;
    if (
        normalized.includes('word') ||
        normalized.includes('officedocument.wordprocessingml.document') ||
        normalized.includes('msword')
    ) {
        return <FileType className="h-5 w-5 text-stone-500" />;
    }
    if (
        normalized.includes('sheet') ||
        normalized.includes('excel') ||
        normalized.includes('spreadsheetml')
    ) {
        return <Sheet className="h-5 w-5 text-stone-500" />;
    }
    if (
        normalized.includes('image/jpeg') ||
        normalized.includes('image/jpg') ||
        normalized.includes('image/png') ||
        normalized.includes('image/webp')
    ) {
        return <ImageIcon className="h-5 w-5 text-stone-500" />;
    }

    return <File className="h-5 w-5 text-stone-500" />;
}

function ExpiryStatus({ deletedAt }: { deletedAt: string }) {
    const expiry = getExpiryBadge(deletedAt);

    return (
        <Badge
            variant="outline"
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${expiry.className}`}
        >
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
        <div className="flex flex-col gap-3 border-t border-[#ead8cd] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">
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
    const [isEmptyingTrash, setIsEmptyingTrash] = useState(false);
    const [searchValue, setSearchValue] = useState(search);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const allSelected = useMemo(
        () => documents.data.length > 0 && selectedIds.length === documents.data.length,
        [documents.data.length, selectedIds.length],
    );

    const hasDocuments = documents.data.length > 0;
    const hasSearch = searchValue !== '' || search !== '';

    const toggleAll = (checked: boolean) => {
        setSelectedIds(checked ? documents.data.map((document) => document.id) : []);
    };

    const toggleOne = (documentId: number, checked: boolean) => {
        setSelectedIds((current) =>
            checked ? [...current, documentId] : current.filter((id) => id !== documentId),
        );
    };

    useEffect(() => {
        setSearchValue(search);
    }, [search]);

    useEffect(() => {
        const currentIds = new Set(documents.data.map((document) => document.id));

        setSelectedIds((current) => current.filter((id) => currentIds.has(id)));
    }, [documents.data]);

    useEffect(
        () => () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        },
        [],
    );

    const runSearch = (value: string) => {
        router.get(route('documents.trash'), value ? { search: value } : {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
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
            },
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

    const handleEmptyTrash = () => {
        setIsEmptyingTrash(true);
        router.delete(route('documents.empty-trash'), {
            preserveScroll: true,
            onFinish: () => setIsEmptyingTrash(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                        Retention Area
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Trash</h1>
                        <p className="max-w-3xl text-sm text-stone-500">
                            Deleted files stay here for 30 days before they are permanently removed.
                            Restore anything you still need, or clear the trash when you are ready.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Trash" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Alert className="rounded-[28px] border border-amber-200/70 bg-amber-50/80 px-5 py-4 text-amber-900 shadow-sm">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-base font-semibold text-amber-900">
                            Items in trash will be deleted forever after 30 days
                        </AlertTitle>
                        <AlertDescription className="mt-1 text-sm leading-7 text-amber-800">
                            You can manually empty the trash to permanently delete these items
                            immediately, or restore them if they were moved here by mistake.
                        </AlertDescription>
                    </Alert>

                    {(hasDocuments || hasSearch) && (
                        <div className="rounded-[28px] border border-[#ead8cd] bg-white/90 p-5 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative w-full lg:max-w-md">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                                    <Input
                                        value={searchValue}
                                        onChange={handleSearch}
                                        placeholder="Search deleted files..."
                                        className="h-12 rounded-2xl border-[#e8d7cc] bg-[#fffaf7] pl-10 pr-10 text-sm shadow-none focus-visible:ring-amber-200"
                                        aria-label="Search deleted files"
                                    />
                                    {searchValue && (
                                        <button
                                            type="button"
                                            onClick={clearSearch}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-700"
                                            aria-label="Clear search"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    {selectedIds.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-11 rounded-2xl border-[#d9c5b8] bg-white px-4 text-sm text-stone-700"
                                            onClick={handleRestoreSelected}
                                            disabled={isRestoringSelected}
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Restore Selected
                                        </Button>
                                    )}

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="h-11 rounded-2xl border-[#efc7b8] bg-[#fff7f4] px-4 text-sm text-[#a64624] hover:bg-[#fdebe4]"
                                                disabled={!hasDocuments || isEmptyingTrash}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Empty Trash
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Empty trash permanently?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Every file currently in trash will be deleted forever and
                                                    cannot be recovered.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    onClick={handleEmptyTrash}
                                                >
                                                    Empty Trash
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </div>
                    )}

                    {!hasDocuments && !search ? (
                        <div className="flex min-h-[56vh] items-center justify-center rounded-[32px] border border-[#f1e3db] bg-white/70 px-6 py-14 text-center shadow-sm">
                            <div className="max-w-xl space-y-6">
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#f8e5df]">
                                    <Trash2 className="h-10 w-10 text-[#c65e38]" />
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-4xl font-semibold tracking-tight text-stone-950">
                                        Your trash is empty
                                    </h2>
                                    <p className="text-lg leading-8 text-stone-600">
                                        Items you delete will appear here for 30 days before being
                                        permanently removed from your workspace.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    disabled
                                    className="h-14 rounded-2xl bg-[#f6dfd7] px-8 text-lg font-medium text-[#c28b76] hover:bg-[#f6dfd7]"
                                >
                                    Empty Trash
                                </Button>
                            </div>
                        </div>
                    ) : !hasDocuments ? (
                        <div className="rounded-[28px] border border-dashed border-[#e9d9cf] bg-white/80 px-6 py-16 text-center shadow-sm">
                            <div className="mx-auto max-w-md space-y-2">
                                <p className="text-xl font-semibold text-stone-900">No matching files found</p>
                                <p className="text-sm text-stone-500">
                                    No deleted files match <span className="font-medium text-stone-700">"{search}"</span>.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                            <Table>
                                <TableHeader className="bg-[#fff8f4] [&_tr]:border-[#ead8cd]">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={(checked) => toggleAll(checked === true)}
                                                aria-label="Select all documents in trash"
                                            />
                                        </TableHead>
                                        <TableHead className="py-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Name
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Size
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Deleted On
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Expires In
                                        </TableHead>
                                        <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.data.map((document) => (
                                        <TableRow key={document.id} className="border-[#f0e1d8] hover:bg-[#fffaf7]">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(document.id)}
                                                    onCheckedChange={(checked) => toggleOne(document.id, checked === true)}
                                                    aria-label={`Select ${document.original_name}`}
                                                />
                                            </TableCell>
                                            <TableCell className="py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f9efe9]">
                                                        {getFileIcon(document.mime_type)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p
                                                            className="max-w-[320px] truncate text-sm font-medium text-stone-950"
                                                            title={document.original_name}
                                                        >
                                                            {document.original_name}
                                                        </p>
                                                        <p className="text-xs text-stone-500">Deleted file</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-stone-500">
                                                {formatBytes(document.file_size)}
                                            </TableCell>
                                            <TableCell className="text-sm text-stone-500">
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
                                                                            className="rounded-xl border-[#d9c5b8] bg-white text-stone-700"
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
                                                                    "{document.original_name}" will be moved back to
                                                                    your vault.
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
                                                                className="rounded-xl text-[#b54a25] hover:bg-[#fff2ec] hover:text-[#a13f1d]"
                                                                disabled={processingId === document.id}
                                                                aria-label={`Delete ${document.original_name} permanently`}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Delete Permanently
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>
                                                                    Permanently delete this document?
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    "{document.original_name}" will be permanently
                                                                    deleted and cannot be recovered. This action cannot
                                                                    be undone.
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
                                <TableFooter className="bg-[#fffdfa]">
                                    <TableRow className="border-[#ead8cd] hover:bg-transparent">
                                        <TableCell colSpan={6}>
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                <span className="text-sm text-stone-500">
                                                    {selectedIds.length > 0
                                                        ? `${selectedIds.length} selected`
                                                        : `${documents.total} item(s) currently in trash`}
                                                </span>
                                                {selectedIds.length > 0 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="self-start rounded-xl text-stone-700 hover:bg-[#f7ede7]"
                                                        onClick={handleRestoreSelected}
                                                        disabled={isRestoringSelected}
                                                        aria-label={`Restore ${selectedIds.length} selected document${selectedIds.length !== 1 ? 's' : ''}`}
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        Restore Selected
                                                    </Button>
                                                )}
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
