import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps, PaginatedResponse } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import GravatarAvatar from '@/components/GravatarAvatar';
import { formatDistanceToNow } from 'date-fns';
import {
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
    User,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type Permission = 'view_only' | 'download' | 'full_access';

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
        include_expired?: boolean;
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

function getPermissionLabel(permission: Permission) {
    switch (permission) {
        case 'view_only':
            return 'View Only';
        case 'download':
            return 'Download';
        case 'full_access':
            return 'Full Access';
    }
}

function getPermissionBadge(permission: Permission) {
    switch (permission) {
        case 'view_only':
            return 'bg-muted text-muted-foreground';
        case 'download':
            return 'bg-primary/10 text-primary';
        case 'full_access':
            return 'bg-primary text-primary-foreground';
    }
}

function FilterPanel({
    permissionFilters,
    setPermissionFilters,
    sharedByFilter,
    setSharedByFilter,
    showExpired,
    onToggleShowExpired,
    clearFilters,
}: {
    permissionFilters: Record<Permission, boolean>;
    setPermissionFilters: React.Dispatch<React.SetStateAction<Record<Permission, boolean>>>;
    sharedByFilter: string;
    setSharedByFilter: React.Dispatch<React.SetStateAction<string>>;
    showExpired: boolean;
    onToggleShowExpired: (checked: boolean) => void;
    clearFilters: () => void;
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Permission</p>
                <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                        checked={permissionFilters.view_only}
                        onCheckedChange={(checked) =>
                            setPermissionFilters((current) => ({
                                ...current,
                                view_only: checked === true,
                            }))
                        }
                    />
                    View Only
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                        checked={permissionFilters.download}
                        onCheckedChange={(checked) =>
                            setPermissionFilters((current) => ({
                                ...current,
                                download: checked === true,
                            }))
                        }
                    />
                    Download
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                        checked={permissionFilters.full_access}
                        onCheckedChange={(checked) =>
                            setPermissionFilters((current) => ({
                                ...current,
                                full_access: checked === true,
                            }))
                        }
                    />
                    Full Access
                </label>
            </div>

            <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Shared by</p>
                <Input
                    value={sharedByFilter}
                    onChange={(event) => setSharedByFilter(event.target.value)}
                    placeholder="Name or email"
                    className="bg-background"
                />
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={showExpired} onCheckedChange={(checked) => onToggleShowExpired(checked === true)} />
                Show expired shares
            </label>

            <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                Clear Filters
            </button>
        </div>
    );
}

export default function SharedWithMe({ shares, filters }: Props) {
    const [search, setSearch] = useState('');
    const [sharedByFilter, setSharedByFilter] = useState('');
    const showExpired = filters.include_expired === true;
    const [permissionFilters, setPermissionFilters] = useState<Record<Permission, boolean>>({
        view_only: false,
        download: false,
        full_access: false,
    });

    const activeFilterCount =
        Number(permissionFilters.view_only) +
        Number(permissionFilters.download) +
        Number(permissionFilters.full_access) +
        Number(sharedByFilter.trim().length > 0) +
        Number(showExpired);
    const isEmpty = shares.total === 0;

    const filteredShares = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const normalizedSharedBy = sharedByFilter.trim().toLowerCase();
        const activePermissions = (Object.entries(permissionFilters) as Array<[Permission, boolean]>)
            .filter(([, enabled]) => enabled)
            .map(([permission]) => permission);

        return shares.data.filter((share) => {
            if (normalizedSearch && !share.document.original_name.toLowerCase().includes(normalizedSearch)) return false;
            if (activePermissions.length > 0 && !activePermissions.includes(share.permission)) return false;
            if (normalizedSharedBy) {
                const haystack = `${share.shared_by.name} ${share.shared_by.email}`.toLowerCase();
                if (!haystack.includes(normalizedSharedBy)) return false;
            }

            return true;
        });
    }, [permissionFilters, search, shares.data, sharedByFilter]);

    const clearFilters = () => {
        setPermissionFilters({
            view_only: false,
            download: false,
            full_access: false,
        });
        setSharedByFilter('');
        router.get(route('shared.index'), {}, { preserveScroll: true, preserveState: true, replace: true });
    };

    const toggleShowExpired = (checked: boolean) => {
        router.get(
            route('shared.index'),
            checked ? { include_expired: 1 } : {},
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
                        <p className="text-sm text-muted-foreground">Main &#8250; Shared with Me</p>
                    </div>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="relative shrink-0">
                                <SlidersHorizontal className="h-4 w-4" />
                                Filter
                                {activeFilterCount > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end">
                            <FilterPanel
                                permissionFilters={permissionFilters}
                                setPermissionFilters={setPermissionFilters}
                                sharedByFilter={sharedByFilter}
                                setSharedByFilter={setSharedByFilter}
                                showExpired={showExpired}
                                onToggleShowExpired={toggleShowExpired}
                                clearFilters={clearFilters}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            }
        >
            <Head title="Shared with Me" />

            <TooltipProvider>
                <div className="py-10">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {isEmpty ? (
                            <div className="flex min-h-[calc(100vh-18rem)] items-center justify-center">
                                <div className="flex max-w-md flex-col items-center text-center">
                                    <div className="relative mb-6">
                                        <div className="rounded-xl bg-muted p-4">
                                            <FolderOpen className="h-14 w-14 text-primary" />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 rounded-full border border-border bg-card p-1.5">
                                            <Link2 className="h-5 w-5 text-primary" />
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-semibold text-foreground">Nothing shared with you yet</h3>
                                    <p className="mt-3 max-w-sm text-center text-sm text-muted-foreground">
                                        Documents shared with you will appear here.
                                    </p>
                                </div>
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
                                            className="bg-background pl-9"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 self-end sm:self-auto">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="relative">
                                                    <SlidersHorizontal className="h-4 w-4" />
                                                    Filter
                                                    {activeFilterCount > 0 && (
                                                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                                                            {activeFilterCount}
                                                        </span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent align="end">
                                                <FilterPanel
                                                    permissionFilters={permissionFilters}
                                                    setPermissionFilters={setPermissionFilters}
                                                    sharedByFilter={sharedByFilter}
                                                    setSharedByFilter={setSharedByFilter}
                                                    showExpired={showExpired}
                                                    onToggleShowExpired={toggleShowExpired}
                                                    clearFilters={clearFilters}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <p className="text-sm text-muted-foreground">{filteredShares.length} shared</p>
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
                                            const now = Date.now();
                                            const isExpired = share.expires_at ? new Date(share.expires_at).getTime() < now : false;
                                            const isExpiringSoon = share.expires_at
                                                ? new Date(share.expires_at).getTime() - now <= 24 * 60 * 60 * 1000 && !isExpired
                                                : false;

                                            return (
                                                <div
                                                    key={share.id}
                                                    className={`rounded-lg border border-border bg-card p-4 ${isExpired ? 'opacity-50' : ''}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                                            {getFileIcon(share.document.mime_type)}
                                                        </div>
                                                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getPermissionBadge(share.permission)}`}>
                                                            {getPermissionLabel(share.permission)}
                                                        </span>
                                                    </div>

                                                    <div className="mt-4 space-y-1">
                                                        <p className="truncate font-medium text-foreground" title={share.document.original_name}>
                                                            {share.document.original_name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">{formatBytes(share.document.file_size)}</p>
                                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                            <GravatarAvatar 
                                                                name={share.shared_by.name} 
                                                                avatarUrl={share.shared_by.avatar_url} 
                                                                size="xs" 
                                                            />
                                                            <span className="truncate">Shared by {share.shared_by.name}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-5 flex items-end justify-between gap-3">
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-muted-foreground">
                                                                Shared {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                                                            </p>
                                                            {share.expires_at && (
                                                                <div className={`flex items-center gap-1 text-xs ${isExpiringSoon ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>
                                                                        Expires {formatDistanceToNow(new Date(share.expires_at), { addSuffix: true })}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {isExpired ? (
                                                            <span className="text-xs text-muted-foreground">Expired</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" asChild>
                                                                            <Link href={route('documents.show', share.document.id)}>
                                                                                <Eye className="h-4 w-4" />
                                                                                <span className="sr-only">View Details</span>
                                                                            </Link>
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>View Details</TooltipContent>
                                                                </Tooltip>

                                                                {(share.permission === 'download' || share.permission === 'full_access') && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                onClick={() => window.location.assign(route('documents.download', share.document.id))}
                                                                            >
                                                                                <Download className="h-4 w-4" />
                                                                                <span className="sr-only">Download</span>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Download</TooltipContent>
                                                                    </Tooltip>
                                                                )}

                                                                {share.permission === 'full_access' && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="icon" asChild>
                                                                                <Link href={route('documents.show', share.document.id)}>
                                                                                    <Share2 className="h-4 w-4" />
                                                                                    <span className="sr-only">Share</span>
                                                                                </Link>
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Share</TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {shares.total > 12 && (
                                    <div className="flex items-center justify-between gap-3">
                                        <Button variant="outline" onClick={() => goToPage(shares.prev_page_url)} disabled={!shares.prev_page_url}>
                                            Previous
                                        </Button>
                                        <p className="text-sm text-muted-foreground">
                                            Page {shares.current_page} of {shares.last_page}
                                        </p>
                                        <Button variant="outline" onClick={() => goToPage(shares.next_page_url)} disabled={!shares.next_page_url}>
                                            Next
                                        </Button>
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
