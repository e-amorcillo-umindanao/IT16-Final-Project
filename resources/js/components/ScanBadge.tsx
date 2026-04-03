import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, ShieldCheck, ShieldOff, ShieldX } from 'lucide-react';
import type { ElementType } from 'react';

export type ScanResult = 'pending' | 'clean' | 'unscanned' | 'unavailable' | 'malicious';

const config: Record<
    ScanResult,
    {
        label: string;
        icon: ElementType;
        className: string;
        iconClassName?: string;
    }
> = {
    clean: {
        label: 'Clean',
        icon: ShieldCheck,
        className: 'bg-green-500/15 text-green-700 dark:text-green-400 border-transparent',
    },
    pending: {
        label: 'Scanning...',
        icon: Loader2,
        className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-transparent',
        iconClassName: 'animate-spin',
    },
    unscanned: {
        label: 'Unscanned',
        icon: ShieldOff,
        className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent',
    },
    unavailable: {
        label: 'Unavailable',
        icon: ShieldOff,
        className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-transparent',
    },
    malicious: {
        label: 'Malicious',
        icon: ShieldX,
        className: 'bg-destructive/15 text-destructive border-transparent',
    },
};

const tooltips: Record<ScanResult, string> = {
    pending: 'Scan in progress — download unavailable until complete',
    clean: 'VirusTotal found no threats in this file',
    malicious: 'Threat detected — file has been quarantined',
    unavailable: 'VirusTotal could not be reached — file may still be downloaded',
    unscanned: 'File was uploaded before scanning was enabled',
};

export function ScanBadge({ result }: { result: ScanResult }) {
    const { label, icon: Icon, className, iconClassName } = config[result] ?? config.unscanned;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="inline-flex">
                        <Badge variant="outline" className={`gap-1 text-xs font-medium ${className}`}>
                            <Icon className={`h-3 w-3 ${iconClassName ?? ''}`.trim()} />
                            {label}
                        </Badge>
                    </span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltips[result] ?? 'Unknown scan status'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
