import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, ShieldAlert } from 'lucide-react';

interface AuditCategoryTabsProps {
    value: string;
    onChange: (value: string) => void;
    securityCount: number;
}

export function AuditCategoryTabs({ value, onChange, securityCount }: AuditCategoryTabsProps) {
    return (
        <Tabs value={value} onValueChange={onChange} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl bg-[#f5eee8] p-2 sm:grid-cols-3">
                <TabsTrigger
                    value="all"
                    className="justify-start gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm whitespace-normal data-[state=active]:border-[#e2c9ba] data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                    <ClipboardList className="h-3.5 w-3.5" />
                    All Activity
                </TabsTrigger>
                <TabsTrigger
                    value="security"
                    className="justify-start gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm whitespace-normal data-[state=active]:border-[#e2c9ba] data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Security Events
                    {securityCount > 0 && (
                        <span className="ml-auto rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                            {securityCount}
                        </span>
                    )}
                </TabsTrigger>
                <TabsTrigger
                    value="audit"
                    className="justify-start gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left text-sm whitespace-normal data-[state=active]:border-[#e2c9ba] data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                    <ClipboardList className="h-3.5 w-3.5" />
                    General Activity
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
