<?php

namespace App\Http\Controllers;

use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\AuditLog;
use App\Services\AuditDescriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    public function __construct(
        private readonly AuditDescriptionService $auditDescriptionService,
    ) {
    }

    /**
     * Display a listing of the user's activity logs.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();
        $query = $this->personalLogsQuery($request, $user->id);

        return Inertia::render('Activity/Index', [
            'logs' => $query
                ->paginate(15)
                ->withQueryString()
                ->through(fn (AuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'description' => $this->auditDescriptionService->generate($log),
                    'metadata' => $log->metadata,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at,
                    'auditable' => $log->auditable ? [
                        'original_name' => $log->auditable->original_name ?? null,
                    ] : null,
                ]),
            'filters' => $request->only(['action', 'from_date', 'to_date']),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $logs = $this->personalLogsQuery($request, Auth::id())->get([
            'id',
            'action',
            'ip_address',
            'metadata',
            'created_at',
        ]);

        return response()->streamDownload(function () use ($logs) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Timestamp', 'Action', 'IP Address', 'Details']);

            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->created_at->toIso8601String(),
                    $log->action,
                    $log->ip_address,
                    $this->auditDescriptionService->generate($log),
                ]);
            }

            fclose($handle);
        }, 'activity-log.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function exportPdf(Request $request)
    {
        $user = Auth::user();
        $logs = $this->personalLogsQuery($request, $user->id)
            ->with('user')
            ->get();

        $pdf = Pdf::loadView('pdf.audit-log', [
            'logs' => $logs,
            'auditDescriptionService' => $this->auditDescriptionService,
            'userName' => $user->name,
            'isAdmin' => false,
            'dateRange' => $this->formatDateRange($request),
        ]);

        return $pdf->download('securevault-audit-log.pdf');
    }

    private function personalLogsQuery(Request $request, int $userId)
    {
        $query = AuditLog::where('user_id', $userId)
            ->with(['auditable' => fn ($query) => $query->withTrashed()])
            ->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }

        if ($request->filled('to_date')) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        return $query;
    }

    private function formatDateRange(Request $request): ?string
    {
        $from = $request->input('from_date');
        $to = $request->input('to_date');

        if (!$from && !$to) {
            return null;
        }

        if ($from && $to) {
            return "{$from} to {$to}";
        }

        return $from ? "From {$from}" : "Until {$to}";
    }
}
