import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface LoginChartProps {
    data: Array<{
        date: string;
        logins: number;
    }>;
}

const chartConfig = {
    logins: {
        label: 'Successful logins',
        color: 'var(--primary)',
    },
} satisfies ChartConfig;

export function LoginChart({ data }: LoginChartProps) {
    const isEmpty = data.every((item) => item.logins === 0);

    return (
        <div className="space-y-3">
            <ChartContainer config={chartConfig} className="h-56 w-full">
                <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.45} />
                    <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        tickMargin={10}
                        className="fill-muted-foreground"
                    />
                    <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11 }}
                        tickMargin={8}
                        width={34}
                        className="fill-muted-foreground"
                    />
                    <ChartTooltip
                        content={<ChartTooltipContent className="min-w-[11rem]" />}
                        cursor={false}
                    />
                    <Bar
                        dataKey="logins"
                        fill="var(--primary)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                    />
                </BarChart>
            </ChartContainer>

            <p
                className={cn(
                    'text-xs text-muted-foreground',
                    isEmpty ? 'block' : 'sr-only',
                )}
            >
                No successful logins recorded in the last 7 days.
            </p>
        </div>
    );
}
