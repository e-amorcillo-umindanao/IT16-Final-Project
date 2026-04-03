import { differenceInDays, isPast, parseISO } from 'date-fns';

export type ExpiryTier = 'safe' | 'warn' | 'danger' | 'expired';

export interface ExpiryInfo {
    label: string;
    tier: ExpiryTier;
}

export function formatExpiry(expiresAt: string | null): ExpiryInfo | null {
    if (!expiresAt) {
        return null;
    }

    const date = parseISO(expiresAt);

    if (isPast(date)) {
        return { label: 'Expired', tier: 'expired' };
    }

    const days = differenceInDays(date, new Date());

    if (days <= 0) {
        return { label: 'Expires today', tier: 'danger' };
    }

    if (days <= 3) {
        return {
            label: `Expires in ${days} day${days === 1 ? '' : 's'}`,
            tier: 'danger',
        };
    }

    if (days <= 7) {
        return {
            label: `Expires in ${days} days`,
            tier: 'warn',
        };
    }

    return {
        label: `Expires in ${days} days`,
        tier: 'safe',
    };
}

export const expiryTierClass: Record<ExpiryTier, string> = {
    safe: 'text-muted-foreground',
    warn: 'text-amber-600 dark:text-amber-400',
    danger: 'text-destructive',
    expired: 'text-destructive',
};
