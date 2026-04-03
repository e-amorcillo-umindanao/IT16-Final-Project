import * as React from 'react';
import { ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

import { cn } from '@/lib/utils';

export type ChartConfig = Record<
    string,
    {
        label?: React.ReactNode;
        color?: string;
    }
>;

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChartConfig() {
    const context = React.useContext(ChartContext);

    if (!context) {
        throw new Error('Chart components must be used within a ChartContainer.');
    }

    return context;
}

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    config: ChartConfig;
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
    ({ className, config, children, style, ...props }, ref) => {
        const chartStyle = React.useMemo(() => {
            return Object.fromEntries(
                Object.entries(config)
                    .filter(([, item]) => Boolean(item.color))
                    .map(([key, item]) => [`--color-${key}`, item.color]),
            ) as React.CSSProperties;
        }, [config]);

        return (
            <ChartContext.Provider value={config}>
                <div
                    ref={ref}
                    className={cn('w-full', className)}
                    style={{ ...chartStyle, ...style }}
                    {...props}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        {children}
                    </ResponsiveContainer>
                </div>
            </ChartContext.Provider>
        );
    },
);
ChartContainer.displayName = 'ChartContainer';

const ChartTooltip = RechartsTooltip;

interface ChartTooltipContentProps {
    active?: boolean;
    payload?: Array<{
        color?: string;
        dataKey?: string | number;
        name?: string;
        value?: string | number | null;
    }>;
    label?: React.ReactNode;
    className?: string;
    hideLabel?: boolean;
}

function ChartTooltipContent({
    active,
    payload,
    label,
    className,
    hideLabel = false,
}: ChartTooltipContentProps) {
    const config = useChartConfig();

    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div
            className={cn(
                'min-w-[10rem] rounded-xl border border-border/80 bg-background/95 px-3 py-2.5 text-xs shadow-sm backdrop-blur',
                className,
            )}
        >
            {!hideLabel && label ? (
                <div className="mb-2 text-sm font-semibold text-foreground">{label}</div>
            ) : null}
            <div className="space-y-1.5">
                {payload.map((entry, index) => {
                    const key = String(entry.dataKey ?? entry.name ?? index);
                    const item = config[key];
                    const itemLabel = item?.label ?? entry.name ?? key;

                    return (
                        <div key={`${key}-${index}`} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <span
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: entry.color ?? item?.color ?? 'currentColor' }}
                                />
                                <span>{itemLabel}</span>
                            </div>
                            <span className="font-medium tabular-nums text-foreground">{entry.value ?? 0}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent };
