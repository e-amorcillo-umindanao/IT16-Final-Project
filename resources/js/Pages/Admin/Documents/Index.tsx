import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileTypeBadge } from '@/components/FileTypeBadge';
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
import { ScanBadge, type ScanResult } from '@/components/ScanBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableHeader } from '@/components/SortableHeader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import UserAvatar from '@/components/UserAvatar';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    Download,
    Eye,
    File,
    FileImage,
    FileSpreadsheet,
    FileText,
    Lock,
    Search,
    ShieldAlert,
    SlidersHorizontal,
} from 'lucide-react';
import { FormEvent, MouseEvent, useState } from 'react';

interface AdminDocumentRow {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    file_hash: string | null;
    scan_result: ScanResult;
    created_at: string;
    has_integrity_violation: boolean;
    user: {
        name: string;
        email: string;
        avatar_url?: string | null;
    };
}

interface OwnerOption {
    id: number;
    label: string;
}

interface Props extends PageProps {
    documents: PaginatedResponse<AdminDocumentRow>;
    filters: {
        search?: string;
        type?: string;
    };
    sort: string;
    direction: 'asc' | 'desc';
    selectedOwner: string | null;
    users: OwnerOption[];
}

function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileIcon(mimeType: string) {
    switch (mimeType) {
        case 'application/pdf':
            return FileText;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return FileText;
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return FileSpreadsheet;
        case 'image/jpeg':
        case 'image/png':
        case 'image/webp':
            return FileImage;
        default:
            return File;
    }
}

export default function AdminDocumentsIndex({
    documents,
    filters,
    sort,
    direction,
    selectedOwner,
    users,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [type, setType] = useState(filters.type ?? 'all');
    const [ownerId, setOwnerId] = useState(selectedOwner ?? 'all');

    const currentCountLabel = `Showing ${documents.data.length} of ${documents.total} documents`;
    const activeQuery = {
        search: filters.search || undefined,
        type: filters.type && filters.type !== 'all' ? filters.type : undefined,
        owner_id: selectedOwner ?? undefined,
    };

    const submitFilters = (override?: Partial<{ search: string; type: string; ownerId: string }>) => {
        const next = {
            search,
            type,
            ownerId,
            ...override,
        };

        const query = {
            search: next.search || undefined,
            type: next.type !== 'all' ? next.type : undefined,
            owner_id: next.ownerId !== 'all' ? next.ownerId : undefined,
            sort,
            direction,
        };

        router.get(route('admin.documents'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleRowClick = (documentId: number) => {
        router.visit(`/documents/${documentId}`);
    };

    const stopRowNavigation = (event: MouseEvent<Element>) => {
        event.stopPropagation();
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                        Admin Library
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                            All Documents
                        </h1>
                        <p className="max-w-3xl text-sm text-stone-500">
                            Review every stored document across the system in read-only mode, with
                            quick visibility into ownership, scanning, encryption, and integrity.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="All Documents" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Alert className="rounded-[28px] border border-stone-200/80 bg-stone-50 px-5 py-4 text-stone-700 shadow-sm">
                        <ShieldAlert className="h-4 w-4 text-stone-500" />
                        <AlertDescription className="text-sm leading-7 text-stone-600">
                            You are viewing all system documents in read-only mode. Download,
                            delete, and share controls are hidden.
                        </AlertDescription>
                    </Alert>

                    <div className="rounded-[30px] border border-[#ecd8ce] bg-[#fdf8f4] p-6 shadow-sm">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                                    Document Oversight
                                </p>
                                <h2 className="text-2xl font-semibold tracking-tight text-stone-950">
                                    System-wide document inventory
                                </h2>
                                <p className="max-w-3xl text-sm leading-7 text-stone-500">
                                    Review ownership, scan results, encryption details, and integrity
                                    signals across every stored document without exposing edit actions.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <Button
                                    variant="outline"
                                    className="h-11 rounded-2xl border-[#d7c3b7] bg-white px-4 text-stone-700"
                                    asChild
                                >
                                    <a href={route('admin.documents.export')}>
                                        <Download className="h-4 w-4" />
                                        Export CSV
                                    </a>
                                </Button>
                                <div className="rounded-full border border-[#ead8cd] bg-white px-4 py-2 text-sm text-stone-600">
                                    {currentCountLabel}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className="rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                        <CardContent className="p-5">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                <form
                                    id="admin-documents-filters"
                                    onSubmit={(event: FormEvent) => {
                                        event.preventDefault();
                                        submitFilters();
                                    }}
                                    className="flex flex-1 flex-col gap-3 xl:flex-row xl:items-center"
                                >
                                    <div className="relative w-full xl:max-w-sm">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Filter documents..."
                                            aria-label="Search documents by filename"
                                            className="h-12 rounded-2xl border-[#e8d7cc] bg-[#fffaf7] pl-10 text-sm shadow-none focus-visible:ring-amber-200"
                                        />
                                    </div>

                                    <div className="w-full xl:w-[180px]">
                                        <Select
                                            value={type}
                                            onValueChange={(value) => {
                                                setType(value);
                                                submitFilters({ type: value });
                                            }}
                                        >
                                            <SelectTrigger
                                                aria-label="Filter documents by type"
                                                className="h-12 rounded-2xl border-[#e8d7cc] bg-white shadow-none"
                                            >
                                                <SelectValue placeholder="All Types" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value="pdf">PDF</SelectItem>
                                                <SelectItem value="word">Word</SelectItem>
                                                <SelectItem value="excel">Excel</SelectItem>
                                                <SelectItem value="image">Image</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="w-full xl:w-[240px]">
                                        <Select
                                            value={ownerId}
                                            onValueChange={(value) => {
                                                setOwnerId(value);
                                                submitFilters({ ownerId: value });
                                            }}
                                        >
                                            <SelectTrigger
                                                aria-label="Filter documents by owner"
                                                className="h-12 rounded-2xl border-[#e8d7cc] bg-white shadow-none"
                                            >
                                                <SelectValue placeholder="All owners" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All owners</SelectItem>
                                                {users.map((user) => (
                                                    <SelectItem key={user.id} value={String(user.id)}>
                                                        {user.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </form>

                                <Button
                                    form="admin-documents-filters"
                                    type="submit"
                                    variant="outline"
                                    className="h-12 rounded-2xl border-[#d7c3b7] bg-white px-4 text-stone-700"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Apply Filters
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-[#fff8f4] [&_tr]:border-[#ead8cd]">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="py-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Document Name
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            <SortableHeader
                                                column="owner"
                                                label="Owner"
                                                currentSort={sort}
                                                currentDirection={direction}
                                                defaultDirection="asc"
                                                routeName="admin.documents"
                                                query={activeQuery}
                                            />
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Type
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Scan Status
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            <SortableHeader
                                                column="file_size"
                                                label="Size"
                                                currentSort={sort}
                                                currentDirection={direction}
                                                defaultDirection="desc"
                                                routeName="admin.documents"
                                                query={activeQuery}
                                            />
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            <SortableHeader
                                                column="created_at"
                                                label="Uploaded"
                                                currentSort={sort}
                                                currentDirection={direction}
                                                defaultDirection="desc"
                                                routeName="admin.documents"
                                                query={activeQuery}
                                            />
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Encryption
                                        </TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Integrity
                                        </TableHead>
                                        <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="py-16 text-center text-stone-500">
                                                No documents found for the current filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.data.map((doc) => {
                                            const FileIcon = getFileIcon(doc.mime_type);

                                            return (
                                                <TableRow
                                                    key={doc.id}
                                                    className="cursor-pointer border-[#f0e1d8] hover:bg-[#fffaf7]"
                                                    onClick={() => handleRowClick(doc.id)}
                                                >
                                                    <TableCell className="py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f9efe9]">
                                                                <FileIcon className="h-5 w-5 text-[#b24b23]" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="max-w-[240px] truncate text-sm font-medium text-stone-950">
                                                                    {doc.original_name}
                                                                </div>
                                                                <div className="text-xs text-stone-500">#{doc.id}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <UserAvatar user={doc.user} size="sm" />
                                                            <div className="min-w-0">
                                                                <div className="text-sm text-stone-950">{doc.user.name}</div>
                                                                <div className="max-w-[180px] truncate text-xs text-stone-500">
                                                                    {doc.user.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <FileTypeBadge mimeType={doc.mime_type} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <ScanBadge result={doc.scan_result} />
                                                    </TableCell>
                                                    <TableCell className="text-sm text-stone-600">
                                                        {formatFileSize(doc.file_size)}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-sm text-stone-600">
                                                        {format(new Date(doc.created_at), 'MMM dd, yyyy')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="rounded-xl border-[#ebd5ca] bg-[#f9efe9] px-2.5 py-1 text-xs text-stone-700"
                                                                    >
                                                                        <Lock className="mr-1 h-3 w-3" />
                                                                        AES-256
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>AES-256-CBC with unique IV per file</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    {doc.file_hash ? (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="rounded-xl border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700"
                                                                        >
                                                                            Verified
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="rounded-xl border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-700"
                                                                        >
                                                                            No hash
                                                                        </Badge>
                                                                    )}
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>
                                                                        {doc.file_hash
                                                                            ? 'SHA-256 hash recorded for integrity verification'
                                                                            : 'No integrity hash is currently stored for this file'}
                                                                    </p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="rounded-xl text-stone-700 hover:bg-[#f7ede7]"
                                                            onClick={(event) => {
                                                                stopRowNavigation(event);
                                                                router.visit(`/documents/${doc.id}`);
                                                            }}
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            View Details
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>

                            <div className="flex flex-col gap-4 border-t border-[#ead8cd] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-stone-500">{currentCountLabel}</p>
                                {documents.last_page > 1 && (
                                    <Pagination className="mx-0 w-auto justify-end">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href={documents.prev_page_url ?? '#'}
                                                    className={!documents.prev_page_url ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                            {documents.links.slice(1, -1).map((link, index) => (
                                                <PaginationItem key={`${link.label}-${index}`}>
                                                    {link.label === '...' ? (
                                                        <PaginationEllipsis />
                                                    ) : (
                                                        <PaginationLink href={link.url ?? '#'} isActive={link.active}>
                                                            {link.label}
                                                        </PaginationLink>
                                                    )}
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext
                                                    href={documents.next_page_url ?? '#'}
                                                    className={!documents.next_page_url ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
