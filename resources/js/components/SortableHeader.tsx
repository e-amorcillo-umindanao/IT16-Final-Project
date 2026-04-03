import { router } from '@inertiajs/react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

interface SortableHeaderProps {
    column: string;
    label: string;
    currentSort: string;
    currentDirection: 'asc' | 'desc';
    defaultDirection?: 'asc' | 'desc';
    routeName?: string;
    query?: Record<string, string | number | boolean | null | undefined>;
}

export function SortableHeader({
    column,
    label,
    currentSort,
    currentDirection,
    defaultDirection = 'asc',
    routeName = 'documents.index',
    query = {},
}: SortableHeaderProps) {
    const isActive = currentSort === column;
    const nextDirection = isActive
        ? currentDirection === 'asc'
            ? 'desc'
            : 'asc'
        : defaultDirection;

    const handleSort = () => {
        router.get(
            route(routeName),
            {
                ...query,
                sort: column,
                direction: nextDirection,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    return (
        <button
            type="button"
            onClick={handleSort}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
            {label}
            {isActive ? (
                currentDirection === 'asc' ? (
                    <ChevronUp className="h-3 w-3" />
                ) : (
                    <ChevronDown className="h-3 w-3" />
                )
            ) : (
                <ChevronsUpDown className="h-3 w-3 opacity-40" />
            )}
        </button>
    );
}
