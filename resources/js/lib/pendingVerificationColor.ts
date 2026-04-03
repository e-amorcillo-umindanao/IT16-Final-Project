export function pendingVerificationColor(count: number): string {
    if (count > 0) {
        return 'text-amber-600 dark:text-amber-400';
    }

    return 'text-muted-foreground';
}
