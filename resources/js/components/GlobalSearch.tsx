import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandInput,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { router } from '@inertiajs/react';
import { Activity, FileText, Loader2, Search, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type SearchResult = {
    type: 'document' | 'log' | 'user';
    id: number;
    title: string;
    subtitle: string;
    url: string;
    icon: string;
};

type SearchResults = {
    documents: SearchResult[];
    logs: SearchResult[];
    users: SearchResult[];
};

interface GlobalSearchProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    compact?: boolean;
}

const emptyResults: SearchResults = {
    documents: [],
    logs: [],
    users: [],
};

export default function GlobalSearch({
    open,
    onOpenChange,
    compact = false,
}: GlobalSearchProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults>(emptyResults);
    const [loading, setLoading] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults(emptyResults);
            setLoading(false);
        }
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        if (query.length < 2) {
            setResults(emptyResults);
            setLoading(false);
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        let isCurrentRequest = true;

        debounceRef.current = setTimeout(async () => {
            setLoading(true);

            try {
                const response = await fetch(
                    `${route('search')}?q=${encodeURIComponent(query)}`,
                    {
                        headers: {
                            Accept: 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error('Search failed');
                }

                const data = await response.json();

                if (isCurrentRequest) {
                    setResults(data.results ?? emptyResults);
                }
            } catch {
                if (isCurrentRequest) {
                    setResults(emptyResults);
                }
            } finally {
                if (isCurrentRequest) {
                    setLoading(false);
                }
            }
        }, 300);

        return () => {
            isCurrentRequest = false;

            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [open, query]);

    const totalResults =
        results.documents.length + results.logs.length + results.users.length;

    const handleSelect = (url: string) => {
        onOpenChange(false);
        router.visit(url);
    };

    const getIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'document':
                return <FileText className="h-4 w-4 text-primary" />;
            case 'log':
                return <Activity className="h-4 w-4 text-muted-foreground" />;
            case 'user':
                return <User className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <>
            <button
                type="button"
                className={
                    compact
                        ? 'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                        : 'flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:w-72'
                }
                onClick={() => onOpenChange(true)}
                aria-label="Open global search"
            >
                <Search className="h-4 w-4 shrink-0" />
                {!compact && (
                    <>
                        <span className="flex-1 truncate text-left">Search documents, logs, users...</span>
                        <kbd className="hidden h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] sm:inline-flex">
                            Ctrl K
                        </kbd>
                    </>
                )}
            </button>

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl overflow-hidden p-0">
                    <DialogTitle className="sr-only">Global search</DialogTitle>
                    <DialogDescription className="sr-only">
                        Search documents, activity logs, and users.
                    </DialogDescription>

                    <Command shouldFilter={false} className="rounded-lg">
                        <CommandInput
                            autoFocus
                            placeholder="Search documents, logs, users..."
                            value={query}
                            onValueChange={setQuery}
                            aria-label="Search documents, activity logs, and users"
                        />
                        <div aria-live="polite" aria-atomic="true" className="sr-only">
                            {query.length < 2
                                ? ''
                                : loading
                                  ? 'Searching'
                                  : totalResults > 0
                                    ? `${totalResults} search result${totalResults !== 1 ? 's' : ''} found`
                                    : `No results found for ${query}`}
                        </div>
                        <CommandList className="max-h-[420px]">
                            {query.length < 2 && (
                                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                    Type at least 2 characters to search.
                                </div>
                            )}

                            {query.length >= 2 && loading && (
                                <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Searching...
                                </div>
                            )}

                            {query.length >= 2 && !loading && totalResults === 0 && (
                                <CommandEmpty>No results found for "{query}".</CommandEmpty>
                            )}

                            {results.documents.length > 0 && (
                                <CommandGroup heading="Documents">
                                    {results.documents.map((result) => (
                                        <CommandItem
                                            key={`document-${result.id}`}
                                            onSelect={() => handleSelect(result.url)}
                                            className="cursor-pointer gap-3 px-4 py-3"
                                        >
                                            {getIcon(result.type)}
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {result.title}
                                                </p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {result.subtitle}
                                                </p>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {results.logs.length > 0 && (
                                <>
                                    {results.documents.length > 0 && <CommandSeparator />}
                                    <CommandGroup heading="Activity Logs">
                                        {results.logs.map((result) => (
                                            <CommandItem
                                                key={`log-${result.id}`}
                                                onSelect={() => handleSelect(result.url)}
                                                className="cursor-pointer gap-3 px-4 py-3"
                                            >
                                                {getIcon(result.type)}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-foreground">
                                                        {result.title}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {result.subtitle}
                                                    </p>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}

                            {results.users.length > 0 && (
                                <>
                                    {(results.documents.length > 0 || results.logs.length > 0) && (
                                        <CommandSeparator />
                                    )}
                                    <CommandGroup heading="Users">
                                        {results.users.map((result) => (
                                            <CommandItem
                                                key={`user-${result.id}`}
                                                onSelect={() => handleSelect(result.url)}
                                                className="cursor-pointer gap-3 px-4 py-3"
                                            >
                                                {getIcon(result.type)}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-foreground">
                                                        {result.title}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {result.subtitle}
                                                    </p>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}
                        </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>
        </>
    );
}
