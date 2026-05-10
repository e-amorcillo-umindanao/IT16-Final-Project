<?php

namespace App\Http\Controllers;

use App\Enums\AuditCategory;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Models\AuditLog;
use App\Services\AuditDescriptionService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    private const LEGACY_SECURITY_ACTIONS = [
        'two_factor_deadline_set',
    ];

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
        $direction = $this->direction($request);
        $query = $this->personalLogsQuery($request, $user->id);

        return Inertia::render('Activity/Index', [
            'logs' => $query
                ->paginate(15)
                ->withQueryString()
                ->through(fn (AuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'category' => $this->effectiveCategory($log)->value,
                    'description' => $this->auditDescriptionService->generate($log),
                    'metadata' => $log->metadata,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at,
                    'auditable' => $log->auditable ? [
                        'original_name' => $log->auditable->original_name ?? null,
                    ] : null,
                ]),
            'filters' => [
                'category' => $this->categoryFilter($request),
                ...$request->only(['action', 'from_date', 'to_date']),
            ],
            'securityCount' => $this->effectiveSecurityCount(
                AuditLog::query()->where('user_id', $user->id),
            ),
            'auditCount' => $this->effectiveAuditCount(
                AuditLog::query()->where('user_id', $user->id),
            ),
            'direction' => $direction,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $logs = $this->personalLogsQuery($request, Auth::id())->get([
            'id',
            'action',
            'category',
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
            'category' => $this->categoryFilter($request),
        ]);

        return $pdf->download('securevault-audit-log.pdf');
    }

    private function personalLogsQuery(Request $request, int $userId): Builder
    {
        $query = AuditLog::where('user_id', $userId)
            ->with(['auditable' => fn ($query) => $query->withTrashed()])
            ->orderBy('created_at', $this->direction($request));

        if (($category = $this->categoryFilter($request)) !== 'all') {
            $this->applyEffectiveCategoryFilter($query, $category);
        }

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

    private function categoryFilter(Request $request): string
    {
        $category = $request->input('category', 'all');

        return in_array($category, ['all', AuditCategory::Security->value, AuditCategory::Audit->value], true)
            ? $category
            : 'all';
    }

    private function applyEffectiveCategoryFilter(Builder $query, string $category): void
    {
        if ($category === AuditCategory::Security->value) {
            $query->where(function (Builder $builder): void {
                $builder
                    ->where('category', AuditCategory::Security->value)
                    ->orWhereIn('action', self::LEGACY_SECURITY_ACTIONS);
            });

            return;
        }

        if ($category === AuditCategory::Audit->value) {
            $query->where('category', AuditCategory::Audit->value)
                ->whereNotIn('action', self::LEGACY_SECURITY_ACTIONS);
        }
    }

    private function effectiveCategory(AuditLog $log): AuditCategory
    {
        if (in_array($log->action, self::LEGACY_SECURITY_ACTIONS, true)) {
            return AuditCategory::Security;
        }

        return $log->category === AuditCategory::Security->value
            ? AuditCategory::Security
            : AuditCategory::Audit;
    }

    private function effectiveSecurityCount(Builder $query): int
    {
        $this->applyEffectiveCategoryFilter($query, AuditCategory::Security->value);

        return $query->count();
    }

    private function effectiveAuditCount(Builder $query): int
    {
        $this->applyEffectiveCategoryFilter($query, AuditCategory::Audit->value);

        return $query->count();
    }

    private function direction(Request $request): string
    {
        return $request->input('direction') === 'asc' ? 'asc' : 'desc';
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
