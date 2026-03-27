<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Services\AuditIntegrityService;
use App\Services\AuditService;
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
        return Inertia::render('Admin/AuditIntegrity', [
            'totalEntries' => AuditLog::count(),
            'results' => null,
        ]);
    }

    public function verify(Request $request): Response
    {
        $validated = $request->validate([
            'scope' => ['nullable', 'in:full,recent'],
        ]);

        $scope = $validated['scope'] ?? 'full';
        $totalEntries = AuditLog::count();
        $results = $this->auditIntegrityService->verifyChain($scope);

        $this->auditService->log('audit_integrity_check', null, [
            'scope' => $results['scope'],
            'total_checked' => $results['total_checked'],
            'passed' => $results['passed'],
            'failed' => $results['failed'],
            'chain_intact' => $results['chain_intact'],
        ]);

        return Inertia::render('Admin/AuditIntegrity', [
            'totalEntries' => $totalEntries,
            'results' => $results,
        ]);
    }
}
