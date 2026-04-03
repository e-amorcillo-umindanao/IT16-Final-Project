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
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { getAuditActionBadge } from '@/lib/auditActionBadge';
import { cn } from '@/lib/utils';
import { PageProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
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
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold leading-tight text-foreground">Audit Log Integrity</h2>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={route('admin.dashboard')}>Dashboard</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Audit Log Integrity</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Audit Log Integrity" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {lastVerified ? (
                        <Alert
                            className={cn(
                                'flex items-center gap-3 border px-4 py-3 text-sm',
                                lastVerified.passed
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : 'border-destructive/30 bg-destructive/10 text-destructive',
                            )}
                        >
                            {lastVerified.passed ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                            ) : (
                                <XCircle className="h-4 w-4 shrink-0" />
                            )}
                            <AlertDescription className="text-inherit">
                                Last verified <strong>{lastVerified.timestamp}</strong> -{' '}
                                {lastVerified.passed
                                    ? `All ${lastVerified.checked} entries intact (${scopeLabel(lastVerified.mode)} mode)`
                                    : `Failures detected in ${scopeLabel(lastVerified.mode)} mode`}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert className="flex items-center gap-3 border-border px-4 py-3 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0" />
                            <AlertDescription>No verification has been run yet.</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Verification Controls</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                        Verify the HMAC-SHA256 hash chain integrity of the audit log. Every entry
                                        includes the previous entry&apos;s hash, so modifying one record breaks the
                                        chain and becomes detectable on the next verification run.
                                    </p>

                                    <div className="rounded-md border border-border bg-background px-4 py-3">
                                        <p className="text-sm text-muted-foreground">Current audit log entries</p>
                                        <p className="mt-1 text-2xl font-semibold text-foreground">
                                            {totalEntries.toLocaleString()}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Live total across all audit events. This can grow after a verification run.
                                        </p>
                                    </div>

                                    {verifying && (
                                        <div>
                                            <Progress
                                                value={progress}
                                                className="h-1.5"
                                                indicatorClassName="animate-pulse"
                                            />
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Verifying HMAC hash chain...
                                            </p>
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => handleVerify('recent')}
                                            disabled={verifying}
                                            className="gap-2"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            {verifying ? 'Verifying...' : 'Verify recent 500'}
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={() => handleVerify('full')}
                                            disabled={verifying}
                                            className="gap-2"
                                        >
                                            <ShieldCheck className="h-4 w-4" />
                                            {verifying ? 'Verifying...' : 'Verify full chain'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => window.location.assign(route('admin.audit-integrity.export-pdf'))}
                                            disabled={verifying}
                                            className="gap-2"
                                        >
                                            <FileText className="h-4 w-4" />
                                            Download integrity report
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {results && (
                                <Card>
                                    <CardHeader className="border-b border-border">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3">
                                                {results.chain_intact ? (
                                                    <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                                                ) : (
                                                    <ShieldAlert className="h-8 w-8 text-destructive" />
                                                )}
                                                <div>
                                                    <CardTitle
                                                        className={
                                                            results.chain_intact
                                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                                : 'text-destructive'
                                                        }
                                                    >
                                                        {results.chain_intact
                                                            ? 'Chain Integrity Verified'
                                                            : 'Chain Integrity Compromised'}
                                                    </CardTitle>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Checked {results.total_checked.toLocaleString()} entries in{' '}
                                                        {results.duration_ms} ms - Verified at{' '}
                                                        {format(new Date(results.verified_at), 'MMM d, yyyy HH:mm:ss')} -{' '}
                                                        Scope: {scopeLabel(results.scope)}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-3">
                                                <div className="rounded-md border border-border bg-background px-4 py-3">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                        Last Verified Size
                                                    </p>
                                                    <p className="mt-2 text-2xl font-semibold text-foreground">
                                                        {results.total_checked.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="rounded-md border border-border bg-background px-4 py-3">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                        Passed
                                                    </p>
                                                    <p className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
                                                        {results.passed.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="rounded-md border border-border bg-background px-4 py-3">
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                        Failed
                                                    </p>
                                                    <p
                                                        className={cn(
                                                            'mt-2 text-2xl font-semibold',
                                                            results.failed === 0
                                                                ? 'text-emerald-700 dark:text-emerald-400'
                                                                : 'text-destructive',
                                                        )}
                                                    >
                                                        {results.failed.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-5 pt-6">
                                        {results.failed === 0 ? (
                                            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-muted-foreground">
                                                All {results.total_checked.toLocaleString()} entries in the last verified
                                                chain passed hash verification and continuity checks. No tampering detected.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>ID</TableHead>
                                                            <TableHead>Action</TableHead>
                                                            <TableHead>Category</TableHead>
                                                            <TableHead>Timestamp</TableHead>
                                                            <TableHead>Failure Type</TableHead>
                                                            <TableHead>Expected Hash</TableHead>
                                                            <TableHead>Stored Hash</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.failures.map((failure) => {
                                                            const actionBadge = getAuditActionBadge(failure.action);
                                                            const ActionIcon = actionBadge.icon;

                                                            return (
                                                                <TableRow key={`${failure.id}-${failure.failure_type}`}>
                                                                    <TableCell className="font-medium text-foreground">
                                                                        {failure.id}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`gap-1 text-xs font-medium uppercase tracking-wide ${actionBadge.className}`}
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
                                                                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                                                        {failure.created_at
                                                                            ? format(new Date(failure.created_at), 'MMM d, yyyy HH:mm:ss')
                                                                            : '-'}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`text-xs font-medium uppercase tracking-wide ${failureBadgeClass(failure.failure_type)}`}
                                                                        >
                                                                            {failure.failure_type === 'chain_break'
                                                                                ? 'Chain Break'
                                                                                : 'Hash Mismatch'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                                        {failure.expected_hash}
                                                                    </TableCell>
                                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                                        {failure.stored_hash}
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>

                                                {results.failed > results.failures.length && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Showing first {results.failures.length} of{' '}
                                                        {results.failed.toLocaleString()} failures.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {history.length > 0 && (
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            Verification history - last {history.length} runs
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs">Timestamp</TableHead>
                                                    <TableHead className="text-xs">Mode</TableHead>
                                                    <TableHead className="text-xs">Checked</TableHead>
                                                    <TableHead className="text-xs">Passed</TableHead>
                                                    <TableHead className="text-xs">Failed</TableHead>
                                                    <TableHead className="text-xs">Result</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {history.map((run, index) => (
                                                    <TableRow key={`${run.timestamp}-${index}`}>
                                                        <TableCell className="text-xs font-mono">
                                                            {run.timestamp}
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            {scopeLabel(run.mode)}
                                                        </TableCell>
                                                        <TableCell className="text-xs">{run.checked}</TableCell>
                                                        <TableCell className="text-xs">{run.pass_count}</TableCell>
                                                        <TableCell className="text-xs">{run.fail_count}</TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    'border-0 text-xs',
                                                                    run.result === 'pass'
                                                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
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

                        <div className="space-y-6">
                            <Card className="xl:sticky xl:top-6">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm font-medium">
                                        <ShieldCheck className="h-4 w-4 text-primary" />
                                        How audit chain integrity works
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 gap-4 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                <Hash className="h-3 w-3" />
                                                Hash per entry
                                            </div>
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                Every audit log entry is hashed using HMAC-SHA256. The payload
                                                includes the timestamp, user ID, action, category, metadata, and the
                                                previous entry&apos;s hash.
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                <LinkIcon className="h-3 w-3" />
                                                Chained entries
                                            </div>
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                Each entry stores the hash of the entry before it. This creates a
                                                chain, so changing one record invalidates all subsequent hashes and
                                                makes tampering visible.
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                <AlertTriangle className="h-3 w-3" />
                                                Tamper detection
                                            </div>
                                            <p className="text-xs leading-relaxed text-muted-foreground">
                                                Verification recomputes every expected hash and compares it against the
                                                stored value. A mismatch, including edits to the category field, breaks
                                                the chain and is reported as a failure.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
