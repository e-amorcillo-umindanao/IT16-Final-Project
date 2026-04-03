import * as React from 'react';

import { cn } from '@/lib/utils';

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    indicatorClassName?: string;
    max?: number;
    value?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    (
        {
            className,
            indicatorClassName,
            max = 100,
            value = 0,
            ...props
        },
        ref,
    ) => {
        const safeMax = max > 0 ? max : 100;
        const safeValue = typeof value === 'number' ? value : 0;
        const clampedValue = Math.min(Math.max(safeValue, 0), safeMax);
        const percentage = (clampedValue / safeMax) * 100;

        return (
            <div
                ref={ref}
                role="progressbar"
                aria-valuemax={safeMax}
                aria-valuemin={0}
                aria-valuenow={clampedValue}
                className={cn(
                    'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
                    className,
                )}
                {...props}
            >
                <div
                    className={cn(
                        'h-full w-full flex-1 bg-primary transition-transform',
                        indicatorClassName,
                    )}
                    style={{
                        transform: `translateX(-${100 - percentage}%)`,
                    }}
                />
            </div>
        );
    },
);
Progress.displayName = 'Progress';

export { Progress };
