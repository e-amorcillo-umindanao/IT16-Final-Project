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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Head, router, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    CheckCircle2,
    Monitor,
    Shield,
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
                <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                        Network Controls
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                            IP Access Rules
                        </h1>
                        <p className="max-w-3xl text-sm text-stone-500">
                            Manage the IP ranges allowed or denied access to your application. These rules
                            apply immediately and should be reviewed carefully before saving.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="IP Access Rules" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Alert className="rounded-[28px] border border-stone-200/80 bg-stone-50 px-5 py-4 text-stone-700 shadow-sm">
                        <Monitor className="h-4 w-4 text-stone-500" />
                        <AlertDescription className="text-sm leading-7 text-stone-600">
                            Your current IP address is <code className="font-mono font-semibold text-stone-900">{currentIp}</code>.
                            Make sure you do not block yourself.
                        </AlertDescription>
                    </Alert>

                    <Card className="rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                        <CardContent className="space-y-5 p-6">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-semibold text-stone-950">Add Rule</h2>
                                <p className="text-sm text-stone-500">
                                    Create a new allowlist or blocklist entry using a valid CIDR range.
                                </p>
                            </div>

                            <form onSubmit={submitIntent} className="space-y-5">
                                <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_minmax(0,1fr)_auto]">
                                    <div className="space-y-2">
                                        <Label htmlFor="rule-type">Type</Label>
                                        <Select
                                            value={form.data.type}
                                            onValueChange={(value: RuleType) => form.setData('type', value)}
                                        >
                                            <SelectTrigger
                                                id="rule-type"
                                                aria-label="Select rule type"
                                                className="h-12 rounded-2xl border-[#e8d7cc] bg-white shadow-none"
                                            >
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="allowlist">Allowlist</SelectItem>
                                                <SelectItem value="blocklist">Blocklist</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {form.errors.type && <p className="text-sm text-destructive">{form.errors.type}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cidr">CIDR</Label>
                                        <Input
                                            id="cidr"
                                            value={form.data.cidr}
                                            onChange={(event) => form.setData('cidr', event.target.value)}
                                            placeholder="203.0.113.0/24"
                                            className="h-12 rounded-2xl border-[#e8d7cc] bg-[#fffaf7] shadow-none focus-visible:ring-amber-200"
                                        />
                                        {form.errors.cidr && <p className="text-sm text-destructive">{form.errors.cidr}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="label">Label</Label>
                                        <Input
                                            id="label"
                                            value={form.data.label}
                                            onChange={(event) => form.setData('label', event.target.value)}
                                            placeholder="Office network"
                                            className="h-12 rounded-2xl border-[#e8d7cc] bg-[#fffaf7] shadow-none focus-visible:ring-amber-200"
                                        />
                                        {form.errors.label && <p className="text-sm text-destructive">{form.errors.label}</p>}
                                    </div>

                                    <div className="flex items-end">
                                        <Button
                                            type="submit"
                                            disabled={form.processing || !cidrInfo?.valid}
                                            className="h-12 rounded-2xl bg-[#b24b23] px-6 text-white hover:bg-[#9f401c]"
                                        >
                                            Add Rule
                                        </Button>
                                    </div>
                                </div>
                            </form>

                            {selfLockoutRisk && (
                                <div className="flex items-start gap-3 rounded-[20px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        <strong>Self-lockout risk:</strong> your current IP (
                                        <code className="font-mono">{currentIp}</code>) falls inside this CIDR range.
                                        Saving this blocklist rule would deny your own access.
                                    </span>
                                </div>
                            )}

                            {cidrInfo && !selfLockoutRisk && (
                                <div
                                    className={cn(
                                        'flex items-start gap-3 rounded-[20px] border px-4 py-3 text-sm',
                                        cidrInfo.valid
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-destructive/30 bg-destructive/10 text-destructive',
                                    )}
                                >
                                    {cidrInfo.valid ? (
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                    ) : (
                                        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    )}
                                    <span>
                                        {cidrInfo.valid ? (
                                            <>
                                                <code className="font-mono">{cidrInfo.first}</code> -{' '}
                                                <code className="font-mono">{cidrInfo.last}</code> /{' '}
                                                {cidrInfo.count?.toLocaleString()} address
                                                {cidrInfo.count !== 1 ? 'es' : ''}
                                            </>
                                        ) : (
                                            cidrInfo.error
                                        )}
                                    </span>
                                </div>
                            )}

                            <Alert className="rounded-[22px] border border-[#f0d6b9] bg-[#fff8ec] px-4 py-3 text-amber-700 shadow-none">
                                <ShieldAlert className="h-4 w-4 text-amber-600" />
                                <AlertDescription className="text-sm leading-7">
                                    If any allowlist rule exists, all IPs not in that list are denied.
                                    Blocklist rules only apply when no allowlist rules are present.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                        <CardContent className="p-0">
                            <div className="flex items-center justify-between border-b border-[#ead8cd] bg-[#fff8f4] px-6 py-5">
                                <h2 className="text-2xl font-semibold text-stone-950">Current Rules</h2>
                                <div className="rounded-full border border-[#ead8cd] bg-white px-4 py-2 text-sm text-stone-600">
                                    {rules.length} rule{rules.length !== 1 ? 's' : ''}
                                </div>
                            </div>

                            {rules.length === 0 ? (
                                <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-16 text-center">
                                    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#f8e9e2] text-[#d8b8a8]">
                                        <Shield className="h-10 w-10" />
                                    </div>
                                    <p className="text-3xl font-semibold text-stone-950">No rules configured</p>
                                    <p className="mt-3 max-w-lg text-sm leading-7 text-stone-500">
                                        No IP rules are configured yet. Until you add a rule, all IPs are currently allowed.
                                    </p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-white [&_tr]:border-[#ead8cd]">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="py-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Type</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">CIDR</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Label</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Added By</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Added At</TableHead>
                                            <TableHead className="text-right text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rules.map((rule) => (
                                            <TableRow key={rule.id} className="border-[#f0e1d8] hover:bg-[#fffaf7]">
                                                <TableCell>
                                                    <Badge variant="outline" className={typeBadgeClass(rule.type)}>
                                                        {typeLabel(rule.type)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm text-stone-950">
                                                    {rule.cidr}
                                                </TableCell>
                                                <TableCell className="text-sm text-stone-600">
                                                    {rule.label || '-'}
                                                </TableCell>
                                                <TableCell className="text-sm text-stone-800">
                                                    {rule.creator?.name ?? 'Unknown'}
                                                </TableCell>
                                                <TableCell className="text-sm text-stone-600">
                                                    {format(new Date(rule.created_at), 'MMM d, yyyy HH:mm')}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => setRulePendingDelete(rule)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
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
                                        This covers <code className="font-mono">{cidrInfo.first}</code> -{' '}
                                        <code className="font-mono">{cidrInfo.last}</code> ({cidrInfo.count?.toLocaleString()} address
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
