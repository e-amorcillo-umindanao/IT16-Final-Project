import { Badge } from '@/components/ui/badge';
import { getFileTypeBadgeConfig } from '@/lib/fileTypeBadge';

export function FileTypeBadge({ mimeType }: { mimeType: string }) {
    const { label, className } = getFileTypeBadgeConfig(mimeType);

    return (
        <Badge variant="outline" className={`text-xs font-medium uppercase tracking-wide ${className}`}>
            {label}
        </Badge>
    );
}
