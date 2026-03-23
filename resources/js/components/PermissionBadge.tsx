import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type Permission = 'view_only' | 'download' | 'full_access';

const config: Record<Permission, { label: string; className: string }> = {
    view_only: {
        label: 'View Only',
        className: 'border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400',
    },
    download: {
        label: 'Download',
        className: 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    full_access: {
        label: 'Full Access',
        // Elevated access uses the success palette to distinguish it from primary actions.
        className: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    },
};

export function getPermissionLabel(permission: Permission): string {
    return config[permission]?.label ?? config.view_only.label;
}

export function PermissionBadge({
    permission,
    className,
}: {
    permission: Permission;
    className?: string;
}) {
    const { label, className: toneClassName } = config[permission] ?? config.view_only;

    return (
        <Badge
            variant="outline"
            className={cn('text-xs font-medium', toneClassName, className)}
        >
            {label}
        </Badge>
    );
}
