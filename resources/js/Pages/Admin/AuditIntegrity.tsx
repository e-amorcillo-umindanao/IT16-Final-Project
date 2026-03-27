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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { getAuditActionBadge } from '@/lib/auditActionBadge';
import { PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';

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

interface Props extends PageProps {
    totalEntries: number;
    results: VerificationResults | null;
}

function scopeLabel(scope: VerificationScope): string {
    return scope === 'recent' ? 'Recent 500' : 'Full chain';
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

export default function AuditIntegrity({ totalEntries, results }: Props) {
    const fullForm = useForm<{ scope: VerificationScope }>({ scope: 'full' });
    const recentForm = useForm<{ scope: VerificationScope }>({ scope: 'recent' });
    const isProcessing = fullForm.processing || recentForm.processing;

    const runFullVerification = () => {
        fullForm.post(route('admin.audit-integrity.verify'), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const runRecentVerification = () => {
        recentForm.post(route('admin.audit-integrity.verify'), {
            preserveScroll: true,
            preserveState: true,
        });
    };

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
                    <Card>
                        <CardHeader>
                            <CardTitle>Verification Controls</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                                Verify the HMAC-SHA256 hash chain integrity of the audit log. Each log entry is
                                cryptographically linked to the previous entry, so any tampering with audit data
                                will break the chain and be detected here.
                            </p>

                            <div className="rounded-md border border-border bg-background px-4 py-3">
                                <p className="text-sm text-muted-foreground">Total audit log entries</p>
                                <p className="mt-1 text-2xl font-semibold text-foreground">
                                    {totalEntries.toLocaleString()}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Button
                                    type="button"
                                    onClick={runFullVerification}
                                    disabled={isProcessing}
                                    className="gap-2"
                                >
                                    {fullForm.processing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="h-4 w-4" />
                                    )}
                                    {fullForm.processing ? 'Verifying...' : 'Verify Full Chain'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={runRecentVerification}
                                    disabled={isProcessing}
                                    className="gap-2"
                                >
                                    {recentForm.processing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="h-4 w-4" />
                                    )}
                                    {recentForm.processing ? 'Verifying...' : 'Verify Recent (500)'}
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
                                            <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
                                        ) : (
                                            <ShieldAlert className="h-8 w-8 text-destructive" />
                                        )}
                                        <div>
                                            <CardTitle
                                                className={
                                                    results.chain_intact
                                                        ? 'text-green-700 dark:text-green-400'
                                                        : 'text-destructive'
                                                }
                                            >
                                                {results.chain_intact
                                                    ? 'Chain Integrity Verified'
                                                    : 'Chain Integrity Compromised'}
                                            </CardTitle>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Checked {results.total_checked.toLocaleString()} entries in {results.duration_ms}
                                                ms - Verified at{' '}
                                                {format(new Date(results.verified_at), 'MMM d, yyyy HH:mm:ss')} - Scope:{' '}
                                                {scopeLabel(results.scope)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="rounded-md border border-border bg-background px-4 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Total Checked
                                            </p>
                                            <p className="mt-2 text-2xl font-semibold text-foreground">
                                                {results.total_checked.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="rounded-md border border-border bg-background px-4 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Passed
                                            </p>
                                            <p className="mt-2 text-2xl font-semibold text-green-700 dark:text-green-400">
                                                {results.passed.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="rounded-md border border-border bg-background px-4 py-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Failed
                                            </p>
                                            <p
                                                className={`mt-2 text-2xl font-semibold ${
                                                    results.failed === 0
                                                        ? 'text-green-700 dark:text-green-400'
                                                        : 'text-destructive'
                                                }`}
                                            >
                                                {results.failed.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-5 pt-6">
                                {results.failed === 0 ? (
                                    <div className="rounded-md border border-green-500/20 bg-green-500/10 px-4 py-4 text-sm text-muted-foreground">
                                        All {results.total_checked.toLocaleString()} audit log entries passed hash
                                        verification and chain continuity checks. No tampering detected.
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
                                                Showing first {results.failures.length} of {results.failed.toLocaleString()} failures.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
