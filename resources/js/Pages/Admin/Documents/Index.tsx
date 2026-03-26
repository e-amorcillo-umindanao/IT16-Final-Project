import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileTypeBadge } from '@/components/FileTypeBadge';
import { ScanBadge, type ScanResult } from '@/components/ScanBadge';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
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
    scan_result: ScanResult;
    created_at: string;
    has_integrity_violation: boolean;
    user: {
        name: string;
        email: string;
        avatar_url?: string | null;
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
    'bg-amber-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-violet-600',
    'bg-orange-600',
    'bg-teal-600',
];

const getAvatarColor = (name: string) => avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

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
            return FileImage;
        default:
            return File;
    }
}

export default function AdminDocumentsIndex({ documents, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [type, setType] = useState(filters.type ?? 'all');
    const [owner, setOwner] = useState(filters.owner ?? '');

    const currentCountLabel = `Showing ${documents.data.length} of ${documents.total} documents`;

    const submitFilters = (override?: Partial<{ search: string; type: string; owner: string }>) => {
        const next = {
            search,
            type,
            owner,
            ...override,
        };

        const query = Object.fromEntries(Object.entries(next).filter(([, value]) => value && value !== 'all'));

        router.get(route('admin.documents'), query, {
            preserveState: true,
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
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">All Documents</h2>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/admin">Admin</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>All Documents</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="All Documents" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertDescription>
                            You are viewing all system documents in read-only mode. Download, delete, and share controls are hidden.
                        </AlertDescription>
                    </Alert>

                    <Card>
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
                                            aria-label="Search documents by filename or owner"
                                            className="pl-9"
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
                                            <SelectTrigger aria-label="Filter documents by type">
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
                                            aria-label="Filter documents by owner name or email"
                                        />
                                    </div>
                                </form>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <Button form="admin-documents-filters" type="submit" variant="outline">
                                        <SlidersHorizontal className="h-4 w-4" />
                                        Filter
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <a href={route('admin.documents.export')}>
                                            <Download className="h-4 w-4" />
                                            Export CSV
                                        </a>
                                    </Button>
                                    <p className="text-sm text-muted-foreground">{currentCountLabel}</p>
                                    <div aria-live="polite" className="sr-only">
                                        {currentCountLabel}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Document Name</TableHead>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Scan Status</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Uploaded Date</TableHead>
                                        <TableHead>Encryption Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                                                No documents found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.data.map((doc) => {
                                            const FileIcon = getFileIcon(doc.mime_type);

                                            return (
                                                <TableRow
                                                    key={doc.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => handleRowClick(doc.id)}
                                                >
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <FileIcon className="h-4 w-4 flex-shrink-0 text-primary" />
                                                            <div>
                                                                <div className="max-w-[200px] truncate text-sm font-medium text-foreground">
                                                                    {doc.original_name}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">#{doc.id}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-7 w-7">
                                                                <AvatarImage
                                                                    src={doc.user.avatar_url ?? undefined}
                                                                    alt={doc.user.name}
                                                                />
                                                                <AvatarFallback className={`text-xs text-white ${getAvatarColor(doc.user.name)}`}>
                                                                    {getInitials(doc.user.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="text-sm text-foreground">{doc.user.name}</div>
                                                                <div className="text-xs text-muted-foreground">{doc.user.email}</div>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <FileTypeBadge mimeType={doc.mime_type} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <ScanBadge result={doc.scan_result} />
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {formatFileSize(doc.file_size)}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                        <div>{format(new Date(doc.created_at), 'MMM dd, yyyy')}</div>
                                                        <div>{format(new Date(doc.created_at), 'HH:mm')}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {doc.has_integrity_violation ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="gap-1 border-0 bg-destructive/15 text-xs text-destructive"
                                                            >
                                                                <ShieldAlert className="h-3 w-3" />
                                                                Integrity Flag
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="outline"
                                                                className="gap-1 border-0 bg-green-500/15 text-xs text-green-700 dark:text-green-400"
                                                            >
                                                                <Lock className="h-3 w-3" />
                                                                Encrypted
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="gap-1.5"
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
                        </CardContent>
                    </Card>

                    {documents.last_page > 1 && (
                        <Pagination>
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
            </div>
        </AuthenticatedLayout>
    );
}
