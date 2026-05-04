import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { getAuditActionBadge } from '@/lib/auditActionBadge';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Download,
    FileText,
    Hash,
    Link as LinkIcon,
    ShieldAlert,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type VerificationScope = 'full' | 'recent';

interface VerificationFailure {
    id: number;
    action: string;
    category: 'security' | 'audit' | string | null;
    created_at: string | null;
    failure_type: 'hash_mismatch' | 'chain_break';
    expected_hash: string;
    stored_hash: string;
}

interface VerificationResults {
    scope: VerificationScope;
    total_checked: number;
    passed: number;
    failed: number;
    chain_intact: boolean;
    failures: VerificationFailure[];
    verified_at: string;
    duration_ms: number;
}

interface VerificationRun {
    timestamp: string;
    passed: boolean;
    mode: string;
    checked: number;
    pass_count: number;
    fail_count: number;
    result: 'pass' | 'fail';
}

interface Props extends PageProps {
    totalEntries: number;
    results: VerificationResults | null;
    lastVerified: VerificationRun | null;
    history: VerificationRun[];
}

function scopeLabel(scope: string): string {
    if (scope === 'recent') return 'Recent 500';
    if (scope === 'full') return 'Full chain';
    return scope.replace(/[-_]/g, ' ');
}

function categoryBadgeClass(category: string | null): string {
    return category === 'security'
        ? 'border-transparent bg-destructive/15 text-destructive'
        : 'border-transparent bg-muted text-muted-foreground';
}

function failureBadgeClass(type: VerificationFailure['failure_type']): string {
    return type === 'chain_break'
        ? 'border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400'
        : 'border-transparent bg-destructive/15 text-destructive';
}

export default function AuditIntegrity({ totalEntries, results, lastVerified, history }: Props) {
    const [verifying, setVerifying] = useState(false);
    const [progress, setProgress] = useState(0);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearProgressInterval = () => {
        if (progressIntervalRef.current !== null) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    };

    useEffect(() => () => clearProgressInterval(), []);

    function startProgressAnimation() {
        clearProgressInterval();
        setProgress(0);

        progressIntervalRef.current = setInterval(() => {
            setProgress((current) => {
                if (current >= 85) {
                    clearProgressInterval();
                    return 85;
                }

                return Math.min(current + Math.random() * 12, 85);
            });
        }, 200);
    }

    function finishProgress() {
        clearProgressInterval();
        setProgress(100);

        window.setTimeout(() => {
            setVerifying(false);
            setProgress(0);
        }, 600);
    }

    function handleVerify(scope: VerificationScope) {
        setVerifying(true);
        startProgressAnimation();

        router.post(route('admin.audit-integrity.verify'), { scope }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                const nextResults = ((page.props as unknown) as Props).results;

                finishProgress();

                if (!nextResults) {
                    toast.error('Verification finished, but no result was returned.');
                    return;
                }

                if (nextResults.failed === 0) {
                    toast.success(`Integrity verified - all ${nextResults.total_checked} entries passed.`);
                    return;
                }

                toast.error(`Integrity check failed - ${nextResults.failed} issue(s) detected.`);
            },
            onError: () => {
                clearProgressInterval();
                setVerifying(false);
                setProgress(0);
                toast.error('Verification request failed. Please try again.');
            },
        });
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                        Integrity Controls
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight text-stone-950">
                            Audit Log Integrity
                        </h1>
                        <p className="max-w-3xl text-sm text-stone-500">
                            Verify the cryptographic integrity of the audit chain, review prior verification runs,
                            and export a formal integrity report when needed.
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Audit Log Integrity" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="rounded-[30px] border border-[#ecd8ce] bg-[#fdf8f4] px-5 py-4 shadow-sm">
                            <p className="text-sm text-stone-500">Current audit chain size</p>
                            <p className="mt-1 text-3xl font-semibold text-stone-950">
                                {totalEntries.toLocaleString()} entries
                            </p>
                        </div>

                        {lastVerified ? (
                            <Alert
                                className={cn(
                                    'rounded-[24px] border px-4 py-3 shadow-sm xl:min-w-[420px]',
                                    lastVerified.passed
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-[#efc7b8] bg-[#fff1ec] text-[#a93b1e]',
                                )}
                            >
                                {lastVerified.passed ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                ) : (
                                    <XCircle className="h-4 w-4 shrink-0" />
                                )}
                                <AlertDescription className="text-sm">
                                    Last verified: <strong>{lastVerified.timestamp}</strong> -{' '}
                                    {lastVerified.passed
                                        ? `All ${lastVerified.checked} entries intact`
                                        : `Failures detected in ${scopeLabel(lastVerified.mode)} mode`}
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <Alert className="rounded-[24px] border border-[#ead8cd] bg-white/90 px-4 py-3 text-stone-600 shadow-sm xl:min-w-[420px]">
                                <Clock className="h-4 w-4 shrink-0" />
                                <AlertDescription>No verification has been run yet.</AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
                        <Card className="rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                            <CardContent className="space-y-6 p-6">
                                <div className="flex flex-col gap-4 border-b border-[#ead8cd] pb-6 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-semibold text-stone-950">Verification Controls</h2>
                                        <p className="max-w-3xl text-sm leading-7 text-stone-500">
                                            This module verifies the cryptographic integrity of the audit log. It
                                            recalculates the SHA-256 hash for every entry and confirms continuity
                                            across the full chain.
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-4xl font-semibold text-[#b24b23]">
                                            {totalEntries.toLocaleString()}
                                        </p>
                                        <p className="text-sm text-stone-500">entries</p>
                                    </div>
                                </div>

                                {verifying && (
                                    <div className="space-y-2">
                                        <Progress
                                            value={progress}
                                            className="h-2 bg-stone-200"
                                            indicatorClassName="animate-pulse bg-[#b24b23]"
                                        />
                                        <p className="text-xs text-stone-500">Verifying hash chain...</p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleVerify('recent')}
                                        disabled={verifying}
                                        className="h-12 rounded-2xl border-[#d7c3b7] bg-white px-5 text-stone-700"
                                    >
                                        Verify recent 500
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => handleVerify('full')}
                                        disabled={verifying}
                                        className="h-12 rounded-2xl bg-[#b24b23] px-5 text-white hover:bg-[#9f401c]"
                                    >
                                        Verify full chain
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => window.location.assign(route('admin.audit-integrity.export-pdf'))}
                                        disabled={verifying}
                                        className="h-12 rounded-2xl border-[#d7c3b7] bg-white px-5 text-stone-700"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download integrity report
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm xl:sticky xl:top-6">
                            <CardContent className="space-y-6 p-6">
                                <div className="space-y-1 border-b border-[#ead8cd] pb-5">
                                    <h2 className="text-2xl font-semibold text-stone-950">How it works</h2>
                                    <p className="text-sm text-stone-500">
                                        The audit trail stays tamper-evident by design.
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f8e9e2] text-[#b24b23]">
                                            <Hash className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-semibold text-stone-950">Hash per entry</h3>
                                            <p className="text-sm leading-7 text-stone-500">
                                                Every audit log entry has a SHA-256 hash calculated from its contents.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f8e9e2] text-[#b24b23]">
                                            <LinkIcon className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-semibold text-stone-950">Chained entries</h3>
                                            <p className="text-sm leading-7 text-stone-500">
                                                Each entry also stores the hash of the entry before it, creating an
                                                unbroken chain.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f8e9e2] text-[#b24b23]">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-lg font-semibold text-stone-950">Tamper detection</h3>
                                            <p className="text-sm leading-7 text-stone-500">
                                                If any historical entry is altered, its hash changes and the break
                                                becomes visible for all subsequent records.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {results && (
                        <Card className="rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                            <CardContent className="space-y-6 p-6">
                                <div className="flex flex-col gap-4 border-b border-[#ead8cd] pb-6 sm:flex-row sm:items-start">
                                    <div className="mt-1">
                                        {results.chain_intact ? (
                                            <ShieldCheck className="h-8 w-8 text-emerald-600" />
                                        ) : (
                                            <ShieldAlert className="h-8 w-8 text-destructive" />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <h2
                                            className={cn(
                                                'text-2xl font-semibold',
                                                results.chain_intact ? 'text-emerald-700' : 'text-destructive',
                                            )}
                                        >
                                            {results.chain_intact ? 'Chain Integrity Verified' : 'Chain Integrity Compromised'}
                                        </h2>
                                        <p className="text-sm leading-7 text-stone-500">
                                            Checked {results.total_checked.toLocaleString()} entries in {results.duration_ms} ms.
                                            Verified at {format(new Date(results.verified_at), 'MMM d, yyyy HH:mm:ss')} using{' '}
                                            {scopeLabel(results.scope)} mode.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="rounded-[24px] border border-[#ead8cd] bg-[#fffaf7] px-5 py-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Checked</p>
                                        <p className="mt-2 text-3xl font-semibold text-stone-950">
                                            {results.total_checked.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="rounded-[24px] border border-[#d5ede0] bg-emerald-50 px-5 py-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Passed</p>
                                        <p className="mt-2 text-3xl font-semibold text-emerald-700">
                                            {results.passed.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="rounded-[24px] border border-[#efc7b8] bg-[#fff4ee] px-5 py-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-[#b24b23]">Failed</p>
                                        <p
                                            className={cn(
                                                'mt-2 text-3xl font-semibold',
                                                results.failed === 0 ? 'text-emerald-700' : 'text-[#b24b23]',
                                            )}
                                        >
                                            {results.failed.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {results.failed === 0 ? (
                                    <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                                        All {results.total_checked.toLocaleString()} verified entries passed their hash
                                        and continuity checks. No tampering was detected.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <Table>
                                            <TableHeader className="bg-[#fff8f4] [&_tr]:border-[#ead8cd]">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">ID</TableHead>
                                                    <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Action</TableHead>
                                                    <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Category</TableHead>
                                                    <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Timestamp</TableHead>
                                                    <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Failure Type</TableHead>
                                                    <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Expected Hash</TableHead>
                                                    <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Stored Hash</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.failures.map((failure) => {
                                                    const actionBadge = getAuditActionBadge(failure.action);
                                                    const ActionIcon = actionBadge.icon;

                                                    return (
                                                        <TableRow key={`${failure.id}-${failure.failure_type}`} className="border-[#f0e1d8] hover:bg-[#fffaf7]">
                                                            <TableCell className="font-medium text-stone-950">{failure.id}</TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`gap-1 rounded-xl border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${actionBadge.className}`}
                                                                >
                                                                    <ActionIcon className="h-3 w-3" />
                                                                    {actionBadge.label}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-xs font-medium uppercase tracking-wide ${categoryBadgeClass(failure.category)}`}
                                                                >
                                                                    {failure.category ?? 'unknown'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="whitespace-nowrap text-xs text-stone-500">
                                                                {failure.created_at
                                                                    ? format(new Date(failure.created_at), 'MMM d, yyyy HH:mm:ss')
                                                                    : '-'}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-xs font-medium uppercase tracking-wide ${failureBadgeClass(failure.failure_type)}`}
                                                                >
                                                                    {failure.failure_type === 'chain_break' ? 'Chain Break' : 'Hash Mismatch'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-stone-500">
                                                                {failure.expected_hash}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-stone-500">
                                                                {failure.stored_hash}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>

                                        {results.failed > results.failures.length && (
                                            <p className="text-sm text-stone-500">
                                                Showing first {results.failures.length} of {results.failed.toLocaleString()} failures.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {history.length > 0 && (
                        <Card className="overflow-hidden rounded-[30px] border border-[#ead8cd] bg-white/95 shadow-sm">
                            <CardContent className="p-0">
                                <div className="border-b border-[#ead8cd] bg-[#fff8f4] px-6 py-5">
                                    <h2 className="text-2xl font-semibold text-stone-950">
                                        Verification history - last {history.length} runs
                                    </h2>
                                </div>
                                <Table>
                                    <TableHeader className="bg-white [&_tr]:border-[#ead8cd]">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="py-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Timestamp</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Mode</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Checked</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Passed</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Failed</TableHead>
                                            <TableHead className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Result</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history.map((run, index) => (
                                            <TableRow key={`${run.timestamp}-${index}`} className="border-[#f0e1d8] hover:bg-[#fffaf7]">
                                                <TableCell className="font-mono text-sm text-stone-600">{run.timestamp}</TableCell>
                                                <TableCell className="text-sm text-stone-800">{scopeLabel(run.mode)}</TableCell>
                                                <TableCell className="text-sm text-stone-800">{run.checked}</TableCell>
                                                <TableCell className="text-sm font-medium text-emerald-700">{run.pass_count}</TableCell>
                                                <TableCell className="text-sm text-stone-800">{run.fail_count}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            'rounded-full border-0 px-3 py-1 text-xs',
                                                            run.result === 'pass'
                                                                ? 'bg-emerald-100 text-emerald-700'
                                                                : 'bg-destructive/15 text-destructive',
                                                        )}
                                                    >
                                                        {run.result === 'pass' ? 'Pass' : 'Fail'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
