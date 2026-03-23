import { addDays, differenceInDays } from 'date-fns';

interface ExpiryBadgeConfig {
    label: string;
    className: string;
}

export function getExpiryBadge(deletedAt: string): ExpiryBadgeConfig {
    const deletedDate = new Date(deletedAt);
    const expiresAt = addDays(deletedDate, 30);
    const daysRemaining = differenceInDays(expiresAt, new Date());
    const days = Math.max(0, daysRemaining);

    if (days <= 3) {
        return {
            label: days === 0 ? 'Expires today' : `${days}d left`,
            className: 'bg-destructive/15 text-destructive border-transparent',
        };
    }

    if (days <= 7) {
        return {
            label: `${days}d left`,
            className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent',
        };
    }

    return {
        label: `${days}d left`,
        className: 'bg-muted text-muted-foreground border-transparent',
    };
}
