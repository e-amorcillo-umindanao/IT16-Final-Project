<?php

namespace App\Http\Controllers\Admin;

use Barryvdh\DomPDF\Facade\Pdf;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\AuditIntegrityService;
use App\Services\AuditService;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditIntegrityController extends Controller
{
    protected AuditIntegrityService $auditIntegrityService;

    protected AuditService $auditService;

    public function __construct(
        AuditIntegrityService $auditIntegrityService,
        AuditService $auditService,
    ) {
        $this->auditIntegrityService = $auditIntegrityService;
        $this->auditService = $auditService;
    }

    public function index(): Response
    {
        return Inertia::render('Admin/AuditIntegrity', $this->pageProps());
    }

    public function verify(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'scope' => ['nullable', 'in:full,recent'],
        ]);

        $scope = $validated['scope'] ?? 'full';
        $results = $this->auditIntegrityService->verifyChain($scope);
        $this->logVerificationResult($results);

        return redirect()
            ->route('admin.audit-integrity')
            ->with('auditIntegrityResults', $results);
    }

    public function exportPdf(Request $request)
    {
        $lastRun = AuditLog::query()
            ->with('user:id,name')
            ->where('action', 'audit_integrity_check')
            ->latest()
            ->first();

        if (! $lastRun) {
            return redirect()
                ->route('admin.audit-integrity')
                ->with('error', 'No verification has been run yet. Run a verification first.');
        }

        $metadata = is_array($lastRun->metadata) ? $lastRun->metadata : [];
        $results = [
            'scope' => (string) ($metadata['scope'] ?? $metadata['mode'] ?? 'unknown'),
            'total_checked' => (int) ($metadata['total_checked'] ?? $metadata['checked'] ?? 0),
            'passed' => (int) ($metadata['passed'] ?? $metadata['pass_count'] ?? 0),
            'failed' => (int) ($metadata['failed'] ?? $metadata['fail_count'] ?? 0),
            'failures' => is_array($metadata['failures'] ?? null) ? $metadata['failures'] : [],
        ];

        $pdf = Pdf::loadView('pdf.integrity-report', [
            'timestamp' => $this->formatVerificationTimestamp($lastRun->created_at),
            'verifier' => $lastRun->user?->name ?? 'System',
            'mode' => $results['scope'],
            'checked' => $results['total_checked'],
            'passed' => $results['passed'],
            'failed' => $results['failed'],
            'failures' => $results['failures'],
        ]);

        return $pdf->download('integrity-report-'.now()->format('Y-m-d-His').'.pdf');
    }

    /**
     * @param  array{
     *     scope: string,
     *     total_checked: int,
     *     passed: int,
     *     failed: int,
     *     chain_intact: bool
     * }|null  $results
     * @return array<string, mixed>
     */
    private function pageProps(?array $results = null): array
    {
        $results ??= request()->session()->get('auditIntegrityResults');

        $history = AuditLog::query()
            ->where('action', 'audit_integrity_check')
            ->latest()
            ->limit(10)
            ->get(['created_at', 'metadata'])
            ->map(fn (AuditLog $log) => $this->transformVerificationRun($log))
            ->values();

        return [
            'totalEntries' => AuditLog::count(),
            'results' => $results,
            'lastVerified' => $history->first(),
            'history' => $history,
        ];
    }

    /**
     * @return array{
     *     timestamp: string,
     *     passed: bool,
     *     mode: string,
     *     checked: int,
     *     pass_count: int,
     *     fail_count: int,
     *     result: string
     * }
     */
    private function transformVerificationRun(AuditLog $log): array
    {
        $metadata = is_array($log->metadata) ? $log->metadata : [];
        $checked = (int) ($metadata['checked'] ?? $metadata['total_checked'] ?? 0);
        $passCount = (int) ($metadata['pass_count'] ?? $metadata['passed'] ?? 0);
        $failCount = (int) ($metadata['fail_count'] ?? $metadata['failed'] ?? 0);
        $mode = (string) ($metadata['mode'] ?? $metadata['scope'] ?? 'unknown');

        return [
            'timestamp' => $this->formatVerificationTimestamp($log->created_at),
            'passed' => $failCount === 0,
            'mode' => $mode,
            'checked' => $checked,
            'pass_count' => $passCount,
            'fail_count' => $failCount,
            'result' => $failCount === 0 ? 'pass' : 'fail',
        ];
    }

    /**
     * @param  array{
     *     scope: string,
     *     total_checked: int,
     *     passed: int,
     *     failed: int,
     *     chain_intact: bool
     * }  $results
     */
    private function logVerificationResult(array $results): void
    {
        $this->auditService->log('audit_integrity_check', null, [
            'scope' => $results['scope'],
            'mode' => $results['scope'],
            'total_checked' => $results['total_checked'],
            'checked' => $results['total_checked'],
            'passed' => $results['passed'],
            'pass_count' => $results['passed'],
            'failed' => $results['failed'],
            'fail_count' => $results['failed'],
            'chain_intact' => $results['chain_intact'],
            'failures' => array_slice($results['failures'], 0, 50),
        ]);
    }

    private function formatVerificationTimestamp(?CarbonInterface $timestamp): string
    {
        return ($timestamp ?? now())->format('M j, Y h:i:s A');
    }
}
