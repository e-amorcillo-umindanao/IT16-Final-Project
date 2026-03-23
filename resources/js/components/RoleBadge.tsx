import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type RoleBadgeRole = 'super_admin' | 'admin' | 'user';

const config: Record<RoleBadgeRole, { label: string; className: string }> = {
    super_admin: {
        label: 'Super Admin',
        className: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400',
    },
    admin: {
        label: 'Admin',
        className: 'border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400',
    },
    user: {
        label: 'User',
        className: 'border-transparent bg-muted text-muted-foreground',
    },
};

export function normalizeRoleBadgeRole(roleName: string | null | undefined): RoleBadgeRole {
    const normalized = (roleName ?? 'user').toLowerCase().replace(/[\s-]+/g, '_');

    if (normalized === 'super_admin') {
        return 'super_admin';
    }

    if (normalized === 'admin') {
        return 'admin';
    }

    return 'user';
}

export function RoleBadge({
    role,
    className,
}: {
    role: RoleBadgeRole;
    className?: string;
}) {
    const { label, className: toneClassName } = config[role] ?? config.user;

    return (
        <Badge variant="outline" className={cn('text-xs font-medium', toneClassName, className)}>
            {label}
        </Badge>
    );
}
