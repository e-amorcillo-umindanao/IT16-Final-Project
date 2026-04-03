import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { cidrContainsIp, parseCidr } from '@/lib/cidrContains';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    CheckCircle2,
    Monitor,
    ShieldAlert,
    Trash2,
    XCircle,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

type RuleType = 'allowlist' | 'blocklist';

interface IpRuleRow {
    id: number;
    type: RuleType;
    cidr: string;
    label: string | null;
    created_at: string;
    creator: {
        id: number;
        name: string;
    } | null;
}

interface Props extends PageProps {
    currentIp: string;
    rules: IpRuleRow[];
}

function typeBadgeClass(type: RuleType): string {
    return type === 'allowlist'
        ? 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
        : 'border-transparent bg-destructive/15 text-destructive';
}

function typeLabel(type: RuleType): string {
    return type === 'allowlist' ? 'Allowlist' : 'Blocklist';
}

export default function IpRules({ currentIp, rules }: Props) {
    const form = useForm<{
        type: RuleType;
        cidr: string;
        label: string;
    }>({
        type: 'blocklist',
        cidr: '',
        label: '',
    });
    const [rulePendingDelete, setRulePendingDelete] = useState<IpRuleRow | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingRule, setPendingRule] = useState<{
        type: RuleType;
        cidr: string;
        label: string;
    } | null>(null);

    const allowlistCount = useMemo(
        () => rules.filter((rule) => rule.type === 'allowlist').length,
        [rules],
    );
    const blocklistCount = useMemo(
        () => rules.filter((rule) => rule.type === 'blocklist').length,
        [rules],
    );
    const cidrInfo = form.data.cidr.trim().length > 0 ? parseCidr(form.data.cidr) : null;
    const selfLockoutRisk =
        form.data.type === 'blocklist' &&
        form.data.cidr.trim().length > 0 &&
        cidrContainsIp(form.data.cidr, currentIp);

    const submitIntent = (event: FormEvent) => {
        event.preventDefault();

        if (!cidrInfo?.valid) {
            return;
        }

        setPendingRule({
            type: form.data.type,
            cidr: form.data.cidr,
            label: form.data.label,
        });
        setConfirmOpen(true);
    };

    const confirmAddRule = () => {
        if (!pendingRule) {
            return;
        }

        form.post(route('admin.ip-rules.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('cidr', 'label');
                setConfirmOpen(false);
                setPendingRule(null);
            },
        });
    };

    const destroyRule = () => {
        if (!rulePendingDelete) {
            return;
        }

        router.delete(route('admin.ip-rules.destroy', rulePendingDelete.id), {
            preserveScroll: true,
            onFinish: () => setRulePendingDelete(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">IP Access Rules</h2>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={route('admin.dashboard')}>Admin</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>IP Access Rules</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="IP Access Rules" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
                        <Monitor className="h-4 w-4 shrink-0" />
                        <span>
                            Your current IP address is{' '}
                            <code className="font-mono font-medium text-foreground">{currentIp}</code> - ensure you do
                            not block yourself.
                        </span>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Add Rule</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <form onSubmit={submitIntent} className="space-y-5">
                                <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                                    <div className="space-y-2">
                                        <Label htmlFor="rule-type">Type</Label>
                                        <Select
                                            value={form.data.type}
                                            onValueChange={(value: RuleType) => form.setData('type', value)}
                                        >
                                            <SelectTrigger id="rule-type" aria-label="Select rule type">
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="allowlist">Allowlist</SelectItem>
                                                <SelectItem value="blocklist">Blocklist</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {form.errors.type && (
                                            <p className="text-sm text-destructive">{form.errors.type}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cidr">CIDR</Label>
                                        <Input
                                            id="cidr"
                                            value={form.data.cidr}
                                            onChange={(event) => form.setData('cidr', event.target.value)}
                                            placeholder="203.0.113.0/24"
                                        />
                                        {form.errors.cidr && (
                                            <p className="text-sm text-destructive">{form.errors.cidr}</p>
                                        )}
                                        {selfLockoutRisk && (
                                            <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                                <span>
                                                    <strong>Self-lockout risk:</strong> your current IP (
                                                    <code className="font-mono">{currentIp}</code>) falls within this
                                                    CIDR range. Adding this rule will block your own access.
                                                </span>
                                            </div>
                                        )}
                                        {cidrInfo && !selfLockoutRisk && (
                                            <div
                                                className={cn(
                                                    'mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
                                                    cidrInfo.valid
                                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                        : 'border-destructive/30 bg-destructive/10 text-destructive',
                                                )}
                                            >
                                                {cidrInfo.valid ? (
                                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                ) : (
                                                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                )}
                                                <span>
                                                    {cidrInfo.valid ? (
                                                        <>
                                                            <code className="font-mono">{cidrInfo.first}</code>
                                                            {' - '}
                                                            <code className="font-mono">{cidrInfo.last}</code>
                                                            {' · '}
                                                            {cidrInfo.count?.toLocaleString()} address
                                                            {cidrInfo.count !== 1 ? 'es' : ''}
                                                        </>
                                                    ) : (
                                                        cidrInfo.error
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="label">Label</Label>
                                        <Input
                                            id="label"
                                            value={form.data.label}
                                            onChange={(event) => form.setData('label', event.target.value)}
                                            placeholder="Office network"
                                        />
                                        {form.errors.label && (
                                            <p className="text-sm text-destructive">{form.errors.label}</p>
                                        )}
                                    </div>

                                    <div className="flex items-end">
                                        <Button
                                            type="submit"
                                            disabled={form.processing || !cidrInfo?.valid}
                                            className="w-full md:w-auto"
                                        >
                                            Add Rule
                                        </Button>
                                    </div>
                                </div>
                            </form>

                            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
                                <ShieldAlert className="h-4 w-4" />
                                <AlertDescription>
                                    If any allowlist rule exists, all IPs not in the list are denied. Blocklist rules
                                    only apply when no allowlist rules are present.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>Current Rules</CardTitle>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {allowlistCount > 0 && (
                                        <span>
                                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                {allowlistCount}
                                            </span>{' '}
                                            allowlist
                                        </span>
                                    )}
                                    {blocklistCount > 0 && (
                                        <span>
                                            <span className="font-medium text-destructive">{blocklistCount}</span>{' '}
                                            blocklist
                                        </span>
                                    )}
                                    {rules.length === 0 && <span>No rules configured</span>}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>CIDR</TableHead>
                                        <TableHead>Label</TableHead>
                                        <TableHead>Added By</TableHead>
                                        <TableHead>Added At</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rules.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                No IP rules configured. All IPs are currently allowed.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        rules.map((rule) => (
                                            <TableRow key={rule.id}>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={typeBadgeClass(rule.type)}
                                                    >
                                                        {typeLabel(rule.type)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm text-foreground">
                                                    {rule.cidr}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {rule.label || '-'}
                                                </TableCell>
                                                <TableCell className="text-sm text-foreground">
                                                    {rule.creator?.name ?? 'Unknown'}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {format(new Date(rule.created_at), 'MMM d, yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => setRulePendingDelete(rule)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AlertDialog
                open={confirmOpen}
                onOpenChange={(open) => {
                    setConfirmOpen(open);

                    if (!open) {
                        setPendingRule(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Confirm {pendingRule?.type === 'blocklist' ? 'blocklist' : 'allowlist'} rule
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2 text-sm">
                                <p>
                                    You are about to add a <strong>{pendingRule?.type}</strong> rule for{' '}
                                    <code className="rounded bg-muted px-1 font-mono">{pendingRule?.cidr}</code>.
                                </p>
                                {cidrInfo?.valid && (
                                    <p className="text-muted-foreground">
                                        This covers <code className="font-mono">{cidrInfo.first}</code>
                                        {' - '}
                                        <code className="font-mono">{cidrInfo.last}</code> (
                                        {cidrInfo.count?.toLocaleString()} address
                                        {cidrInfo.count !== 1 ? 'es' : ''}).
                                    </p>
                                )}
                                {pendingRule?.type === 'blocklist' && (
                                    <p className="font-medium text-destructive">
                                        Requests from these IPs will be denied immediately.
                                    </p>
                                )}
                                {pendingRule?.type === 'allowlist' && allowlistCount === 0 && (
                                    <p className="font-medium text-amber-600 dark:text-amber-400">
                                        Adding the first allowlist rule will block all IPs not explicitly listed.
                                    </p>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={form.processing}
                            className={pendingRule?.type === 'blocklist' ? 'bg-destructive hover:bg-destructive/90' : ''}
                            onClick={(event) => {
                                event.preventDefault();
                                confirmAddRule();
                            }}
                        >
                            Add rule
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={rulePendingDelete !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRulePendingDelete(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete IP rule?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Remove the {rulePendingDelete ? typeLabel(rulePendingDelete.type).toLowerCase() : ''} rule
                            {' '}for {rulePendingDelete?.cidr ?? 'this CIDR'}?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive/15"
                            onClick={destroyRule}
                        >
                            Delete Rule
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AuthenticatedLayout>
    );
}
