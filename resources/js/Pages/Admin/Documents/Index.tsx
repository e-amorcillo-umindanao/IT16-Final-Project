import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    ChevronLeft,
    ChevronRight,
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
    created_at: string;
    has_integrity_violation: boolean;
    user: {
        name: string;
        email: string;
    };
}

interface Props extends PageProps {
    documents: PaginatedResponse<AdminDocumentRow>;
    filters: {
        search?: string;
        type?: string;
        owner?: string;
    };
}

const avatarColors = [
    'bg-amber-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-red-500',
    'bg-pink-500',
];

const getAvatarColor = (name: string) =>
    avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : parts[0]?.[1] ?? '';

    return `${first}${last}`.toUpperCase();
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

function getDocumentType(mimeType: string) {
    switch (mimeType) {
        case 'application/pdf':
            return {
                label: 'PDF',
                className: 'bg-red-500/15 text-red-600 dark:text-red-400',
                icon: FileText,
            };
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return {
                label: 'DOCX',
                className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                icon: FileText,
            };
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return {
                label: 'XLSX',
                className: 'bg-green-500/15 text-green-600 dark:text-green-400',
                icon: FileSpreadsheet,
            };
        case 'image/jpeg':
        case 'image/png':
            return {
                label: 'IMAGE',
                className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
                icon: FileImage,
            };
        default:
            return {
                label: 'FILE',
                className: 'bg-muted text-muted-foreground',
                icon: File,
            };
    }
}

function getVisiblePages(currentPage: number, lastPage: number) {
    if (lastPage <= 5) {
        return Array.from({ length: lastPage }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
        return [1, 2, 3, 4, 5];
    }

    if (currentPage >= lastPage - 2) {
        return [lastPage - 4, lastPage - 3, lastPage - 2, lastPage - 1, lastPage];
    }

    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
}

export default function AdminDocumentsIndex({ documents, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [type, setType] = useState(filters.type ?? 'all');
    const [owner, setOwner] = useState(filters.owner ?? '');

    const currentCountLabel = `Showing ${documents.data.length} of ${documents.total} documents`;
    const summaryLabel =
        documents.from && documents.to
            ? `Showing ${documents.from}-${documents.to} of ${documents.total} documents`
            : `Showing 0 of ${documents.total} documents`;

    const submitFilters = (override?: Partial<{ search: string; type: string; owner: string }>) => {
        const next = {
            search,
            type,
            owner,
            ...override,
        };

        const query = Object.fromEntries(
            Object.entries(next).filter(([, value]) => value && value !== 'all')
        );

        router.get(route('admin.documents'), query, {
            preserveState: true,
            replace: true,
        });
    };

    const goToPage = (url: string | null) => {
        if (!url) {
            return;
        }

        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    const buildPageUrl = (pageNumber: number) => {
        const params = new URLSearchParams();

        if (filters.search) {
            params.set('search', filters.search);
        }

        if (filters.type) {
            params.set('type', filters.type);
        }

        if (filters.owner) {
            params.set('owner', filters.owner);
        }

        params.set('page', String(pageNumber));

        return `${documents.path}?${params.toString()}`;
    };

    const handleRowClick = (documentId: number) => {
        router.get(route('documents.show', documentId));
    };

    const stopRowNavigation = (event: MouseEvent<Element>) => {
        event.stopPropagation();
    };

    const visiblePages = getVisiblePages(documents.current_page, documents.last_page);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold text-foreground">All Documents</h2>
                        <p className="text-sm text-muted-foreground">
                            Read-only audit view of all uploaded documents within the system.
                        </p>
                        <p className="text-xs text-muted-foreground">Admin &#8250; All Documents</p>
                    </div>

                    <Button form="admin-documents-filters" type="submit" variant="outline">
                        <SlidersHorizontal className="h-4 w-4" />
                        Filter
                    </Button>
                </div>
            }
        >
            <Head title="All Documents" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Card className="bg-card">
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <form
                                    id="admin-documents-filters"
                                    onSubmit={(event: FormEvent) => {
                                        event.preventDefault();
                                        submitFilters();
                                    }}
                                    className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center"
                                >
                                    <div className="relative w-full lg:max-w-sm">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search by filename or owner..."
                                            className="bg-background pl-9"
                                        />
                                    </div>

                                    <div className="w-full lg:w-[180px]">
                                        <Select
                                            value={type}
                                            onValueChange={(value) => {
                                                setType(value);
                                                submitFilters({ type: value });
                                            }}
                                        >
                                            <SelectTrigger className="bg-background">
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

                                    <div className="w-full lg:max-w-sm">
                                        <Input
                                            value={owner}
                                            onChange={(event) => setOwner(event.target.value)}
                                            placeholder="Filter by owner name or email..."
                                            className="bg-background"
                                        />
                                    </div>
                                </form>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <Button variant="outline" asChild>
                                        <a href={route('admin.documents.export')}>
                                            <Download className="h-4 w-4" />
                                            Export CSV
                                        </a>
                                    </Button>
                                    <p className="text-sm text-muted-foreground">{currentCountLabel}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted [&_tr]:border-border">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                            Document Name
                                        </TableHead>
                                        <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                            Owner
                                        </TableHead>
                                        <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                            Type
                                        </TableHead>
                                        <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                            Size
                                        </TableHead>
                                        <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                            Uploaded Date
                                        </TableHead>
                                        <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                            Encryption Status
                                        </TableHead>
                                        <TableHead className="bg-muted text-right text-xs uppercase tracking-wider text-muted-foreground">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.data.length === 0 ? (
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                                                No documents matched your current filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.data.map((document) => {
                                            const typeMeta = getDocumentType(document.mime_type);
                                            const TypeIcon = typeMeta.icon;

                                            return (
                                                <TableRow
                                                    key={document.id}
                                                    className="cursor-pointer border-border hover:bg-muted/50"
                                                    onClick={() => handleRowClick(document.id)}
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <TypeIcon className="h-[18px] w-[18px] shrink-0 text-primary" />
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium text-foreground">
                                                                    {document.original_name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">#{document.id}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white ${getAvatarColor(
                                                                    document.user.name
                                                                )}`}
                                                            >
                                                                {getInitials(document.user.name)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm text-foreground">
                                                                    {document.user.name}
                                                                </p>
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    {document.user.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <span
                                                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${typeMeta.className}`}
                                                        >
                                                            {typeMeta.label}
                                                        </span>
                                                    </TableCell>

                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {formatFileSize(document.file_size)}
                                                    </TableCell>

                                                    <TableCell className="text-xs text-muted-foreground">
                                                        <div>{format(new Date(document.created_at), 'MMM dd, yyyy')}</div>
                                                        <div>{format(new Date(document.created_at), 'HH:mm')}</div>
                                                    </TableCell>

                                                    <TableCell>
                                                        {document.has_integrity_violation ? (
                                                            <div className="space-y-1">
                                                                <span className="inline-flex items-center rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                                                                    <ShieldAlert className="mr-1 h-3 w-3" />
                                                                    Integrity Flag
                                                                </span>
                                                                <p className="text-xs text-muted-foreground">
                                                                    Hash mismatch logged
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1">
                                                                <span className="inline-flex items-center rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                                                                    <Lock className="mr-1 h-3 w-3" />
                                                                    Encrypted
                                                                </span>
                                                                <p className="text-xs text-muted-foreground">AES-256-CBC</p>
                                                            </div>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <Link href={route('documents.show', document.id)} onClick={stopRowNavigation}>
                                                                <Eye className="h-4 w-4" />
                                                                View Details
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">{summaryLabel}</p>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!documents.prev_page_url}
                                onClick={() => goToPage(documents.prev_page_url)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>

                            {visiblePages[0] > 1 && (
                                <>
                                    <Button variant="outline" size="sm" onClick={() => goToPage(buildPageUrl(1))}>
                                        1
                                    </Button>
                                    {visiblePages[0] > 2 && (
                                        <span className="px-2 text-sm text-muted-foreground">...</span>
                                    )}
                                </>
                            )}

                            {visiblePages.map((pageNumber) => (
                                <Button
                                    key={pageNumber}
                                    variant="outline"
                                    size="sm"
                                    className={
                                        pageNumber === documents.current_page
                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            : ''
                                    }
                                    onClick={() => goToPage(buildPageUrl(pageNumber))}
                                >
                                    {pageNumber}
                                </Button>
                            ))}

                            {visiblePages[visiblePages.length - 1] < documents.last_page && (
                                <>
                                    {visiblePages[visiblePages.length - 1] < documents.last_page - 1 && (
                                        <span className="px-2 text-sm text-muted-foreground">...</span>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => goToPage(buildPageUrl(documents.last_page))}
                                    >
                                        {documents.last_page}
                                    </Button>
                                </>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!documents.next_page_url}
                                onClick={() => goToPage(documents.next_page_url)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
