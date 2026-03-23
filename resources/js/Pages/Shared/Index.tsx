import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileTypeBadge } from '@/components/FileTypeBadge';
import { PermissionBadge, type Permission } from '@/components/PermissionBadge';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    AlertTriangle,
    Clock,
    Download,
    Eye,
    File,
    FileText,
    FileType,
    FolderOpen,
    Image as ImageIcon,
    Link2,
    Search,
    Share2,
    Sheet,
    SlidersHorizontal,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface ShareItem {
    id: number;
    permission: Permission;
    expires_at: string | null;
    created_at: string;
    document: {
        id: number;
        original_name: string;
        mime_type: string;
        file_size: number;
    };
    shared_by: {
        name: string;
        email: string;
        avatar_url: string | null;
    };
}

interface Props extends PageProps {
    shares: PaginatedResponse<ShareItem>;
    filters: {
        show_expired?: boolean;
    };
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

function getFileIcon(mimeType: string) {
    const normalized = mimeType.toLowerCase();

    if (normalized.includes('pdf')) return <FileText className="h-7 w-7 text-primary" />;
    if (
        normalized.includes('word') ||
        normalized.includes('officedocument.wordprocessingml.document') ||
        normalized.includes('msword')
    ) {
        return <FileType className="h-7 w-7 text-primary" />;
    }
    if (
        normalized.includes('sheet') ||
        normalized.includes('excel') ||
        normalized.includes('spreadsheetml')
    ) {
        return <Sheet className="h-7 w-7 text-primary" />;
    }
    if (
        normalized.includes('image/jpeg') ||
        normalized.includes('image/jpg') ||
        normalized.includes('image/png')
    ) {
        return <ImageIcon className="h-7 w-7 text-primary" />;
    }

    return <File className="h-7 w-7 text-primary" />;
}

const avatarColors = ['bg-amber-600', 'bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-orange-600', 'bg-teal-600'];

function getAvatarColor(name: string) {
    return avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : parts[0]?.[1] ?? '';
    return `${first}${last}`.toUpperCase();
}

function daysRemaining(value: string) {
    return Math.ceil((new Date(value).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function isShareExpired(value: string | null) {
    return value ? new Date(value).getTime() < Date.now() : false;
}

function formatRelative(value: string) {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function FilterPanel({
    permissionFilters,
    setPermissionFilters,
    expiringSoon,
    onToggleExpiringSoon,
    showExpired,
    onToggleShowExpired,
    hasActiveFilters,
    clearFilters,
}: {
    permissionFilters: Record<Permission, boolean>;
    setPermissionFilters: React.Dispatch<React.SetStateAction<Record<Permission, boolean>>>;
    expiringSoon: boolean;
    onToggleExpiringSoon: (checked: boolean) => void;
    showExpired: boolean;
    onToggleShowExpired: (checked: boolean) => void;
    hasActiveFilters: boolean;
    clearFilters: () => void;
}) {
    return (
        <div className="space-y-4 p-1">
            <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Permission</p>
                <div className="space-y-2">
                    {(['view_only', 'download', 'full_access'] as const).map((permission) => (
                        <div key={permission} className="flex items-center gap-2">
                            <Checkbox
                                id={`filter-${permission}`}
                                checked={permissionFilters[permission]}
                                onCheckedChange={(checked) =>
                                    setPermissionFilters((current) => ({
                                        ...current,
                                        [permission]: checked === true,
                                    }))
                                }
                            />
                            <Label htmlFor={`filter-${permission}`} className="cursor-pointer">
                                <PermissionBadge permission={permission} />
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            <Separator />

            <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Expiry</p>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="filter-expiring-soon"
                            checked={expiringSoon}
                            onCheckedChange={(checked) => onToggleExpiringSoon(checked === true)}
                        />
                        <Label htmlFor="filter-expiring-soon" className="cursor-pointer text-sm font-normal">
                            Expiring soon
                        </Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="filter-show-expired"
                            checked={showExpired}
                            onCheckedChange={(checked) => onToggleShowExpired(checked === true)}
                        />
                        <Label htmlFor="filter-show-expired" className="cursor-pointer text-sm font-normal">
                            Show expired
                        </Label>
                    </div>
                </div>
            </div>

            {hasActiveFilters && (
                <>
                    <Separator />
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-full text-muted-foreground" onClick={clearFilters}>
                        Clear filters
                    </Button>
                </>
            )}
        </div>
    );
}

export default function SharedWithMe({ shares, filters }: Props) {
    const [search, setSearch] = useState('');
    const [expiringSoon, setExpiringSoon] = useState(false);
    const showExpired = filters.show_expired === true;
    const [permissionFilters, setPermissionFilters] = useState<Record<Permission, boolean>>({
        view_only: false,
        download: false,
        full_access: false,
    });

    const activeFilterCount =
        Number(permissionFilters.view_only) +
        Number(permissionFilters.download) +
        Number(permissionFilters.full_access) +
        Number(expiringSoon) +
        Number(showExpired);
    const hasActiveFilters = activeFilterCount > 0;
    const isEmpty = shares.total === 0;

    const filteredShares = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const activePermissions = (Object.entries(permissionFilters) as Array<[Permission, boolean]>)
            .filter(([, enabled]) => enabled)
            .map(([permission]) => permission);

        return shares.data.filter((share) => {
            if (normalizedSearch && !share.document.original_name.toLowerCase().includes(normalizedSearch)) return false;
            if (activePermissions.length > 0 && !activePermissions.includes(share.permission)) return false;
            if (expiringSoon) {
                if (!share.expires_at || isShareExpired(share.expires_at)) return false;
                const remainingDays = daysRemaining(share.expires_at);
                if (remainingDays > 7) return false;
            }

            return true;
        });
    }, [expiringSoon, permissionFilters, search, shares.data]);

    const clearFilters = () => {
        setPermissionFilters({
            view_only: false,
            download: false,
            full_access: false,
        });
        setExpiringSoon(false);
        router.get(route('shared.index'), {}, { preserveScroll: true, preserveState: true, replace: true });
    };

    const toggleShowExpired = (checked: boolean) => {
        router.get(
            route('shared.index'),
            checked ? { show_expired: 1 } : {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            }
        );
    };

    const goToPage = (url: string | null) => {
        if (!url) return;
        router.get(url, {}, { preserveScroll: true, preserveState: true });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <h2 className="text-xl font-semibold leading-tight text-foreground">Shared with Me</h2>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href="/dashboard">Main</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Shared with Me</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>
                </div>
            }
        >
            <Head title="Shared with Me" />

            <TooltipProvider>
                <div className="py-10">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {isEmpty ? (
                            <div className="flex min-h-[calc(100vh-18rem)] items-center justify-center">
                                <Card className="flex w-full max-w-md flex-col items-center justify-center py-20">
                                    <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
                                        <div className="relative">
                                            <div className="inline-block rounded-xl bg-muted p-4">
                                                <FolderOpen className="h-14 w-14 text-muted-foreground" />
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 rounded-full border border-border bg-card p-1.5">
                                                <Link2 className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-foreground">Nothing shared with you yet</h3>
                                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                                Documents shared with you will appear here.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative w-full sm:max-w-sm">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search shared documents..."
                                            aria-label="Search shared documents"
                                            className="bg-background pl-9"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 self-end sm:self-auto">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="relative gap-2">
                                                    <SlidersHorizontal className="h-4 w-4" />
                                                    Filter
                                                    {activeFilterCount > 0 && (
                                                        <Badge className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary p-0 text-xs text-primary-foreground">
                                                            {activeFilterCount}
                                                        </Badge>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent align="end">
                                                <FilterPanel
                                                    permissionFilters={permissionFilters}
                                                    setPermissionFilters={setPermissionFilters}
                                                    expiringSoon={expiringSoon}
                                                    onToggleExpiringSoon={setExpiringSoon}
                                                    showExpired={showExpired}
                                                    onToggleShowExpired={toggleShowExpired}
                                                    hasActiveFilters={hasActiveFilters}
                                                    clearFilters={clearFilters}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <p className="text-sm text-muted-foreground">{filteredShares.length} shared</p>
                                        <div aria-live="polite" aria-atomic="true" className="sr-only">
                                            {search.trim().length >= 2
                                                ? filteredShares.length > 0
                                                    ? `${filteredShares.length} shared document result${filteredShares.length !== 1 ? 's' : ''} found`
                                                    : 'No shared documents found'
                                                : `${filteredShares.length} shared document${filteredShares.length !== 1 ? 's' : ''} shown`}
                                        </div>
                                    </div>
                                </div>

                                {filteredShares.length === 0 ? (
                                    <div className="rounded-xl border border-border bg-card p-10 text-center">
                                        <p className="font-medium text-foreground">No matching shared documents</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredShares.map((share) => {
                                            const expired = isShareExpired(share.expires_at);
                                            const remainingDays = share.expires_at ? daysRemaining(share.expires_at) : null;

                                            return (
                                                <Card
                                                    key={share.id}
                                                    className={`transition-all ${expired ? 'opacity-50' : 'hover:border-primary/30'}`}
                                                >
                                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                                                        <div className="flex items-center gap-2">
                                                            {getFileIcon(share.document.mime_type)}
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-foreground">
                                                                    {share.document.original_name}
                                                                </p>
                                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                    <p className="text-xs text-muted-foreground">{formatBytes(share.document.file_size)}</p>
                                                                    <FileTypeBadge mimeType={share.document.mime_type} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <PermissionBadge permission={share.permission} />
                                                    </CardHeader>

                                                    <CardContent className="space-y-3 pt-0">
                                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                            <Avatar className="h-5 w-5">
                                                                <AvatarImage src={share.shared_by.avatar_url ?? undefined} alt={share.shared_by.name} />
                                                                <AvatarFallback className={`text-[10px] text-white ${getAvatarColor(share.shared_by.name)}`}>
                                                                    {getInitials(share.shared_by.name)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="truncate">Shared by {share.shared_by.name}</span>
                                                        </div>

                                                    <div className="flex items-end justify-between gap-3">
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-muted-foreground">
                                                                Shared {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                                                            </p>
                                                            {share.expires_at && (
                                                                <div className="flex items-center gap-1.5">
                                                                    {remainingDays !== null && remainingDays <= 3 ? (
                                                                        <Badge variant="outline" className="gap-1 border-destructive/20 bg-destructive/10 text-xs text-destructive">
                                                                            <AlertTriangle className="h-3 w-3" />
                                                                            Expires {formatRelative(share.expires_at)}
                                                                        </Badge>
                                                                    ) : remainingDays !== null && remainingDays <= 7 ? (
                                                                        <Badge variant="outline" className="gap-1 border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400">
                                                                            <Clock className="h-3 w-3" />
                                                                            Expires {formatRelative(share.expires_at)}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                                            <Clock className="h-3 w-3" />
                                                                            Expires {formatRelative(share.expires_at)}
                                                                        </span>
                                                                    )}
                                                                    {expired && (
                                                                        <Badge variant="outline" className="text-xs text-muted-foreground">
                                                                            Expired
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {expired ? (
                                                            <span className="text-xs text-muted-foreground">Expired</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            aria-label={`View details for ${share.document.original_name}`}
                                                                            asChild
                                                                        >
                                                                            <Link href={route('documents.show', share.document.id)}>
                                                                                <Eye className="h-4 w-4" />
                                                                                <span className="sr-only">View Details</span>
                                                                            </Link>
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>View Details</p></TooltipContent>
                                                                </Tooltip>

                                                                {(share.permission === 'download' || share.permission === 'full_access') && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => window.location.assign(route('documents.download', share.document.id))}
                                                                                aria-label={`Download ${share.document.original_name}`}
                                                                            >
                                                                                <Download className="h-4 w-4" />
                                                                                <span className="sr-only">Download</span>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent><p>Download</p></TooltipContent>
                                                                    </Tooltip>
                                                                )}

                                                                {share.permission === 'full_access' && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                aria-label={`Manage sharing for ${share.document.original_name}`}
                                                                                asChild
                                                                            >
                                                                                <Link href={route('documents.show', share.document.id)}>
                                                                                    <Share2 className="h-4 w-4" />
                                                                                    <span className="sr-only">Share</span>
                                                                                </Link>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent><p>Share</p></TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}

                                {shares.total > 12 && (
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm text-muted-foreground">
                                            Page {shares.current_page} of {shares.last_page}
                                        </p>
                                        <Pagination className="mx-0 w-auto justify-end">
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationPrevious
                                                        href={shares.prev_page_url ?? '#'}
                                                        className={!shares.prev_page_url ? 'pointer-events-none opacity-50' : ''}
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            goToPage(shares.prev_page_url);
                                                        }}
                                                    />
                                                </PaginationItem>
                                                {shares.links.slice(1, -1).map((link, index) => (
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
                                                        href={shares.next_page_url ?? '#'}
                                                        className={!shares.next_page_url ? 'pointer-events-none opacity-50' : ''}
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            goToPage(shares.next_page_url);
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
        </AuthenticatedLayout>
    );
}
