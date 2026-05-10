import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface EventsChartProps {
    data: Array<{
        hour: string;
        security: number;
        audit: number;
    }>;
}

const chartConfig = {
    security: {
        label: 'Security events',
        color: 'var(--destructive)',
    },
    audit: {
        label: 'General activity',
        color: 'var(--primary)',
    },
} satisfies ChartConfig;

function formatHourTick(value: string) {
    return value.replace(':00', '');
}

export function EventsChart({ data }: EventsChartProps) {
    const isEmpty = data.every((item) => item.security === 0 && item.audit === 0);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                    <span>Security events</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <span>General activity</span>
                </div>
            </div>

            <ChartContainer config={chartConfig} className="h-48 w-full">
                <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }} barCategoryGap="24%">
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.45} />
                    <XAxis
                        dataKey="hour"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                        tickMargin={8}
                        tickFormatter={formatHourTick}
                        interval="preserveStartEnd"
                        minTickGap={24}
                        padding={{ left: 8, right: 8 }}
                        className="fill-muted-foreground"
                    />
                    <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10 }}
                        tickMargin={8}
                        width={30}
                        className="fill-muted-foreground"
                    />
                    <ChartTooltip
                        content={<ChartTooltipContent className="min-w-[11rem]" />}
                        cursor={false}
                    />
                    <Bar
                        dataKey="security"
                        stackId="events"
                        fill="var(--destructive)"
                        radius={[0, 0, 0, 0]}
                        maxBarSize={18}
                    />
                    <Bar
                        dataKey="audit"
                        stackId="events"
                        fill="var(--primary)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={18}
                    />
                </BarChart>
            </ChartContainer>

            <p
                className={cn(
                    'text-xs text-muted-foreground',
                    isEmpty ? 'block' : 'sr-only',
                )}
            >
                No audit events recorded for today yet.
            </p>
        </div>
    );
}
