import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, ShieldAlert } from 'lucide-react';

interface AuditCategoryTabsProps {
    value: string;
    onChange: (value: string) => void;
    securityCount: number;
}

export function AuditCategoryTabs({ value, onChange, securityCount }: AuditCategoryTabsProps) {
    return (
        <Tabs value={value} onValueChange={onChange} className="mb-4">
            <TabsList className="h-9">
                <TabsTrigger value="all" className="gap-1.5 text-xs">
                    <ClipboardList className="h-3.5 w-3.5" />
                    All Activity
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-1.5 text-xs">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Security Events
                    {securityCount > 0 && (
                        <span className="ml-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                            {securityCount}
                        </span>
                    )}
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-1.5 text-xs">
                    <ClipboardList className="h-3.5 w-3.5" />
                    General Activity
                </TabsTrigger>
            </TabsList>
        </Tabs>
    );
}
