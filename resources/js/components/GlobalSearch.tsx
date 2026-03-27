import { Button } from '@/components/ui/button';
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import GravatarAvatar from '@/components/GravatarAvatar';
import { getAuditActionBadge } from '@/lib/auditActionBadge';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    Activity,
    File,
    FileImage,
    FileSpreadsheet,
    FileText,
    Loader2,
    Search,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type SearchTab = 'documents' | 'logs' | 'users';

type SearchDocumentResult = {
    type: 'document';
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    created_at?: string | null;
};

type SearchLogResult = {
    type: 'log';
    id: number;
    action: string;
    created_at?: string | null;
};

type SearchUserResult = {
    type: 'user';
    id: number;
    name: string;
    email: string;
    avatar_url?: string | null;
};

type SearchResults = {
    documents: SearchDocumentResult[];
    logs: SearchLogResult[];
    users: SearchUserResult[];
};

interface GlobalSearchProps {
    auth: {
        permissions?: string[];
    };
}

const emptyResults: SearchResults = {
    documents: [],
    logs: [],
    users: [],
};

const tabMeta: Record<SearchTab, { label: string }> = {
    documents: { label: 'Documents' },
    logs: { label: 'Activity Logs' },
    users: { label: 'Users' },
};

export default function GlobalSearch({ auth }: GlobalSearchProps) {
    const permissions = auth.permissions ?? [];
    const canViewUsers = permissions.includes('manage_users') || permissions.includes('view_audit_logs');

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>(emptyResults);
    const [loading, setLoading] = useState(false);
    const [errorState, setErrorState] = useState<'none' | 'rate'>('none');
    const [activeTab, setActiveTab] = useState<SearchTab>('documents');
    const [shortcutHint, setShortcutHint] = useState<'⌘K' | 'Ctrl K'>('Ctrl K');

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const documentsGroupRef = useRef<HTMLDivElement | null>(null);
    const logsGroupRef = useRef<HTMLDivElement | null>(null);
    const usersGroupRef = useRef<HTMLDivElement | null>(null);

    const visibleTabs = useMemo(
        () => (canViewUsers ? (['documents', 'logs', 'users'] as SearchTab[]) : (['documents', 'logs'] as SearchTab[])),
        [canViewUsers],
    );

    const totalResults = results.documents.length + results.logs.length + results.users.length;

    useEffect(() => {
        const platform = `${navigator.platform} ${navigator.userAgent}`.toLowerCase();
        const isMac = platform.includes('mac');
        setShortcutHint(isMac ? '⌘K' : 'Ctrl K');
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults(emptyResults);
            setLoading(false);
            setErrorState('none');
            setActiveTab('documents');
        }
    }, [open]);

    useEffect(() => {
        if (!canViewUsers && activeTab === 'users') {
            setActiveTab('documents');
        }
    }, [activeTab, canViewUsers]);

    useEffect(() => {
        const tabsWithResults: SearchTab[] = [
            ...(results.documents.length > 0 ? ['documents' as const] : []),
            ...(results.logs.length > 0 ? ['logs' as const] : []),
            ...(canViewUsers && results.users.length > 0 ? ['users' as const] : []),
        ];

        if (tabsWithResults.length === 0) {
            return;
        }

        if (!tabsWithResults.includes(activeTab)) {
            setActiveTab(tabsWithResults[0]);
        }
    }, [activeTab, canViewUsers, results]);

    useEffect(() => {
        if (query.length === 0) {
            setResults(emptyResults);
            setLoading(false);
            setErrorState('none');
            return;
        }

        if (query.length < 2) {
            setResults(emptyResults);
            setLoading(false);
            setErrorState('none');
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        const controller = new AbortController();

        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            setErrorState('none');

            try {
                const response = await axios.get<{ results?: SearchResults }>(route('search'), {
                    params: { q: query },
                    signal: controller.signal,
                    headers: {
                        Accept: 'application/json',
                    },
                });

                const nextResults = response.data.results ?? emptyResults;

                setResults({
                    documents: nextResults.documents ?? [],
                    logs: nextResults.logs ?? [],
                    users: canViewUsers ? nextResults.users ?? [] : [],
                });
            } catch (error) {
                if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') {
                    return;
                }

                if (axios.isAxiosError(error) && error.response?.status === 429) {
                    setErrorState('rate');
                } else {
                    setErrorState('none');
                }

                setResults(emptyResults);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }, 300);

        return () => {
            controller.abort();

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [canViewUsers, query]);

    const getDocumentIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) {
            return FileImage;
        }

        if (mimeType.includes('sheet') || mimeType.includes('excel')) {
            return FileSpreadsheet;
        }

        if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document')) {
            return FileText;
        }

        return File;
    };

    const scrollToGroup = (tab: SearchTab) => {
        setActiveTab(tab);

        const refMap: Record<SearchTab, React.MutableRefObject<HTMLDivElement | null>> = {
            documents: documentsGroupRef,
            logs: logsGroupRef,
            users: usersGroupRef,
        };

        refMap[tab].current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const handleSelectDocument = (id: number) => {
        setOpen(false);
        router.visit(`/documents/${id}`);
    };

    const handleSelectLog = () => {
        setOpen(false);
        router.visit('/activity');
    };

    const handleSelectUser = () => {
        setOpen(false);
        router.visit('/admin/users');
    };

    const renderBeforeTypingState = () => (
        <div className="flex min-h-[280px] items-center justify-center px-6 py-12">
            <div className="max-w-md text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Search className="h-6 w-6" />
                </div>
                <p className="mt-5 text-base font-medium text-foreground">Start with at least 2 characters</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Search by document name, audit action, metadata, user name, or email.
                </p>
            </div>
        </div>
    );

    const renderLoadingState = () => (
        <div className="flex min-h-[240px] items-center justify-center px-6 py-12">
            <div className="flex items-center gap-3 rounded-full border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Searching SecureVault...
            </div>
        </div>
    );

    const renderEmptyState = () => {
        const message =
            errorState === 'rate'
                ? 'Too many requests — please slow down.'
                : `No results found for "${query}"`;

        return (
            <div className="flex min-h-[240px] items-center justify-center px-6 py-12">
                <div className="max-w-md text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <Search className="h-6 w-6" />
                    </div>
                    <p className="mt-5 text-base font-medium text-foreground">{message}</p>
                </div>
            </div>
        );
    };

    const renderDocuments = () => {
        if (results.documents.length === 0) {
            return null;
        }

        return (
            <div ref={documentsGroupRef}>
                <CommandGroup heading="Documents">
                    {results.documents.map((document) => {
                        const Icon = getDocumentIcon(document.mime_type);

                        return (
                            <CommandItem
                                key={`document-${document.id}`}
                                onSelect={() => handleSelectDocument(document.id)}
                                className="mx-2 gap-3 rounded-md px-3 py-3 data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {document.original_name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {document.mime_type}
                                    </p>
                                </div>
                            </CommandItem>
                        );
                    })}
                </CommandGroup>
            </div>
        );
    };

    const renderLogs = () => {
        if (results.logs.length === 0) {
            return null;
        }

        return (
            <div ref={logsGroupRef}>
                <CommandGroup heading="Activity Logs">
                    {results.logs.map((log) => {
                        const badge = getAuditActionBadge(log.action);
                        const timestamp = log.created_at
                            ? format(new Date(log.created_at), 'MMM d, yyyy · h:mm a')
                            : 'Activity log entry';

                        return (
                            <CommandItem
                                key={`log-${log.id}`}
                                onSelect={handleSelectLog}
                                className="mx-2 gap-3 rounded-md px-3 py-3 data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                    <Activity className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {badge.label}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {timestamp}
                                    </p>
                                </div>
                            </CommandItem>
                        );
                    })}
                </CommandGroup>
            </div>
        );
    };

    const renderUsers = () => {
        if (!canViewUsers || results.users.length === 0) {
            return null;
        }

        return (
            <div ref={usersGroupRef}>
                <CommandGroup heading="Users">
                    {results.users.map((user) => (
                        <CommandItem
                            key={`user-${user.id}`}
                            onSelect={handleSelectUser}
                            className="mx-2 gap-3 rounded-md px-3 py-3 data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                        >
                            <GravatarAvatar
                                name={user.name}
                                avatarUrl={user.avatar_url ?? null}
                                size="sm"
                                className="border border-border/60"
                            />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        </CommandItem>
                    ))}
                </CommandGroup>
            </div>
        );
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                className="flex h-10 w-full min-w-0 items-center justify-start gap-2 rounded-md border-border bg-background px-3 text-muted-foreground hover:bg-muted hover:text-foreground sm:w-72"
                onClick={() => setOpen(true)}
                aria-label="Open global search"
            >
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left text-sm">Search documents, logs, users...</span>
                <kbd className="hidden select-none items-center rounded-md border border-border bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground sm:inline-flex">
                    {shortcutHint}
                </kbd>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl overflow-hidden rounded-lg border border-border bg-card p-0 shadow-xl [&>button]:hidden">
                    <Command shouldFilter={false} className="bg-card">
                        <div className="border-b border-border px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="rounded-md bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400">
                                        <Search className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <DialogTitle className="font-semibold text-foreground">
                                            Global Search
                                        </DialogTitle>
                                        <DialogDescription className="mt-1 text-sm text-muted-foreground">
                                            Search across your vault, activity trail, and admin records.
                                        </DialogDescription>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <kbd className="hidden select-none items-center rounded-md border border-border bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground sm:inline-flex">
                                        Esc
                                    </kbd>
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                            aria-label="Close global search"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </DialogClose>
                                </div>
                            </div>

                            <div className="mt-4">
                                <CommandInput
                                    value={query}
                                    onValueChange={(value) => {
                                        setQuery(value);

                                        if (value.length === 0) {
                                            setResults(emptyResults);
                                            setErrorState('none');
                                        }
                                    }}
                                    placeholder="Search documents, logs, users..."
                                    aria-label="Search documents, activity logs, and users"
                                />
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                {visibleTabs.map((tab) => (
                                    <Button
                                        key={tab}
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            'rounded-full px-3 text-xs font-medium',
                                            activeTab === tab
                                                ? 'bg-primary/15 text-primary hover:bg-primary/15 hover:text-primary'
                                                : 'bg-muted text-muted-foreground hover:bg-muted hover:text-foreground',
                                        )}
                                        onClick={() => scrollToGroup(tab)}
                                    >
                                        {tabMeta[tab].label}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <CommandList className="max-h-[430px]">
                            {query.length === 0 && renderBeforeTypingState()}
                            {query.length > 0 && query.length < 2 && renderBeforeTypingState()}
                            {query.length >= 2 && loading && renderLoadingState()}
                            {query.length >= 2 && !loading && totalResults === 0 && renderEmptyState()}

                            {query.length >= 2 && !loading && totalResults > 0 && (
                                <div className="py-2">
                                    {renderDocuments()}
                                    {results.documents.length > 0 &&
                                        (results.logs.length > 0 || (canViewUsers && results.users.length > 0)) && (
                                            <CommandSeparator className="mx-4 my-2" />
                                        )}

                                    {renderLogs()}
                                    {results.logs.length > 0 && canViewUsers && results.users.length > 0 && (
                                        <CommandSeparator className="mx-4 my-2" />
                                    )}

                                    {renderUsers()}
                                </div>
                            )}
                        </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>
        </>
    );
}
