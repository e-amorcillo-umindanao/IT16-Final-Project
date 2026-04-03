export function failedLoginColor(
    count: number,
    warn: number,
    danger: number,
): string {
    if (count >= danger) return 'text-destructive';
    if (count >= warn) return 'text-amber-600 dark:text-amber-400';

    return 'text-muted-foreground';
}
