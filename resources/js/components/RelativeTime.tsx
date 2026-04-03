import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface RelativeTimeProps {
    datetime: string;
    formatted: string;
}

export function RelativeTime({ datetime, formatted }: RelativeTimeProps) {
    const relative = formatDistanceToNow(parseISO(datetime), { addSuffix: true });

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className="cursor-default">{formatted}</span>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{relative}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
