<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditCategory;
use App\Http\Controllers\Controller;
use App\Helpers\MaskingHelper;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\User;
use App\Services\AuditDescriptionService;
use App\Services\AuditService;
use App\Services\IpInfoService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    protected $auditService;

    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    protected function auditDescriptionService(): AuditDescriptionService
    {
        return app(AuditDescriptionService::class);
    }

    /**
     * Display the admin dashboard with security metrics.
     */
    public function dashboard(): Response
    {
        $loginEvents = AuditLog::where('action', 'login_success')
            ->where('created_at', '>=', Carbon::now()->subDays(6)->startOfDay())
            ->get()
            ->groupBy(fn (AuditLog $log) => $log->created_at->toDateString());

        $loginChart = collect();

        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);

            $loginChart->push([
                'date' => $date->format('M j'),
                'logins' => $loginEvents->get($date->toDateString())?->count() ?? 0,
            ]);
        }

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_users' => User::notSystem()->count(),
                'active_users' => User::notSystem()->where('is_active', true)->count(),
                'active_sessions' => DB::table(config('session.table', 'sessions'))
                    ->whereNotNull('user_id')
                    ->count(),
                'total_documents' => Document::whereNull('deleted_at')->count(),
                'vault_storage' => Document::whereNull('deleted_at')->sum('file_size'),
                'failed_logins_24h' => AuditLog::where('action', 'login_failed')
                    ->where('created_at', '>=', now()->subHours(24))
                    ->count(),
                'pending_verifications' => User::notSystem()->whereNull('email_verified_at')->count(),
            ],
            'failed_login_warn' => config('securevault.failed_login_warn'),
            'failed_login_danger' => config('securevault.failed_login_danger'),
            'storage_limit' => config('securevault.storage_limit_bytes'),
            'login_chart' => $loginChart,
            'recent_activity' => AuditLog::with('user')
                ->security()
                ->orderByDesc('created_at')
                ->limit(10)
                ->get()
                ->map(fn ($log) => [
                    'action' => strtolower($log->action),
                    'category' => $log->category,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at,
                    'user' => $log->user ? [
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                        'avatar_url' => $log->user->avatar_url,
                    ] : null,
                ]),
        ]);
    }

    /**
     * Display a listing of all users.
     */
    public function users(Request $request): Response
    {
        $sort = in_array($request->input('sort'), ['name', 'last_login_at'], true)
            ? $request->input('sort')
            : 'name';
        $direction = $request->input('direction') === 'desc' ? 'desc' : 'asc';

        $query = User::notSystem()->with('roles');

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        if ($request->filled('role') && $request->role !== 'all') {
            $query->whereHas('roles', fn ($q) => $q->where('name', $request->role));
        }

        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        if ($request->input('verification') === 'unverified') {
            $query->whereNull('email_verified_at');
        }

        $query->orderBy($sort, $direction)
            ->orderBy('name');

        return Inertia::render('Admin/Users/Index', [
            'users' => $query->paginate(20)->withQueryString()
                ->through(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_active' => $user->is_active,
                    'two_factor_enabled' => $user->two_factor_enabled,
                    'email_verified_at' => $user->email_verified_at,
                    'deletion_requested_at' => $user->deletion_requested_at,
                    'deletion_scheduled_for' => $user->deletion_scheduled_for,
                    'last_login_at' => $user->last_login_at,
                    'last_login_ip' => $user->last_login_ip,
                    'role' => $user->roles->first()?->name ?? 'user',
                    'avatar_url' => $user->avatar_url,
                ]),
            'filters' => $request->only(['search', 'role', 'status', 'verification']),
            'sort' => $sort,
            'direction' => $direction,
        ]);
    }

    /**
     * Activate a user account.
     */
    public function activateUser(User $user): RedirectResponse
    {
        if ($user->isSystemAccount()) {
            return back()->withErrors(['error' => 'System accounts cannot be modified through the UI.']);
        }

        $clearedPendingDeletion = $user->deletion_requested_at !== null
            || $user->deletion_scheduled_for !== null
            || $user->getRawOriginal('deletion_cancel_token') !== null;

        $user->update([
            'is_active' => true,
            'deletion_requested_at' => null,
            'deletion_scheduled_for' => null,
            'deletion_cancel_token' => null,
        ]);

        $this->auditService->log('user_activated', $user, [
            'pending_deletion_cleared' => $clearedPendingDeletion,
        ]);

        return back()->with('success', 'User activated successfully.');
    }

    /**
     * Deactivate a user account.
     */
    public function deactivateUser(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'You cannot deactivate your own account.']);
        }

        if ($user->isSystemAccount()) {
            return back()->withErrors(['error' => 'System accounts cannot be modified through the UI.']);
        }

        DB::table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->delete();

        $user->update(['is_active' => false]);

        $this->auditService->log('user_deactivated', $user);

        return back()->with('success', 'User deactivated successfully.');
    }

    /**
     * Update a user's role.
     */
    public function changeUserRole(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'role' => 'required|in:super-admin,admin,user',
        ]);

        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'You cannot change your own role.']);
        }

        if ($user->isSystemAccount()) {
            return back()->withErrors(['error' => 'System accounts cannot be modified through the UI.']);
        }

        $user->syncRoles([$request->role]);

        $this->auditService->log('user_role_changed', $user, [
            'new_role' => $request->role,
            'target_name' => $user->name,
        ]);

        return back()->with('success', 'User role updated successfully.');
    }

    public function exportUsers()
    {
        $users = User::notSystem()->with('roles')->orderBy('name')->get();
        $csv = "Name,Email,Role,Status,Last Login,Registered\n";

        foreach ($users as $user) {
            $csv .= implode(',', [
                '"' . str_replace('"', '""', $user->name) . '"',
                MaskingHelper::maskEmail($user->email),
                $user->roles->first()?->name ?? 'user',
                $user->is_active ? 'Active' : 'Inactive',
                $user->last_login_at?->toIso8601String() ?? 'Never',
                $user->created_at->toIso8601String(),
            ]) . "\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="users.csv"',
        ]);
    }

    /**
     * Display system-wide audit logs.
     */
    public function auditLogs(Request $request): Response
    {
        $direction = $this->direction($request);
        $query = $this->auditLogsQuery($request);
        $todayLogs = AuditLog::where('created_at', '>=', Carbon::today())
            ->get(['created_at', 'category']);
        $hourlyChart = collect();

        for ($hour = 0; $hour < 24; $hour++) {
            $hourlyChart->push([
                'hour' => str_pad((string) $hour, 2, '0', STR_PAD_LEFT) . ':00',
                'security' => 0,
                'audit' => 0,
            ]);
        }

        $todayLogs->each(function (AuditLog $log) use ($hourlyChart): void {
            $hour = (int) $log->created_at->format('G');
            $key = $log->category === AuditCategory::Security->value ? 'security' : 'audit';
            $slot = $hourlyChart->get($hour);

            if (is_array($slot)) {
                $slot[$key]++;
                $hourlyChart->put($hour, $slot);
            }
        });

        return Inertia::render('Admin/AuditLogs/Index', [
            'logs' => $query
                ->paginate(50)
                ->withQueryString()
                ->through(fn (AuditLog $log) => [
                    'id' => $log->id,
                    'user_id' => $log->user_id,
                    'action' => $log->action,
                    'category' => $log->category,
                    'description' => $this->auditDescriptionService()->generate($log),
                    'metadata' => $log->metadata,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at,
                    'auditable' => $log->auditable ? [
                        'original_name' => $log->auditable->original_name ?? null,
                    ] : null,
                    'user' => $log->user ? [
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                        'avatar_url' => $log->user->avatar_url,
                    ] : null,
                ]),
            'filters' => [
                'category' => $this->categoryFilter($request),
                ...$request->only(['action', 'from_date', 'to_date', 'user_id']),
            ],
            'securityCount' => AuditLog::security()->count(),
            'auditCount' => AuditLog::audit()->count(),
            'direction' => $direction,
            'users' => User::select(['id', 'name', 'email'])
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'label' => "{$user->name} ({$user->email})",
                ]),
            'selectedUser' => $request->filled('user_id') ? (string) $request->input('user_id') : null,
            'hourlyChart' => $hourlyChart->values(),
        ]);
    }

    public function exportAuditLogs(Request $request)
    {
        $logs = $this->auditLogsQuery($request)->get([
            'id',
            'action',
            'category',
            'ip_address',
            'metadata',
            'created_at',
            'user_id',
        ]);

        return response()->streamDownload(function () use ($logs) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Timestamp', 'Action', 'User ID', 'IP Address', 'Details']);

            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->created_at->toIso8601String(),
                    $log->action,
                    $log->user_id,
                    $log->ip_address,
                    $this->auditDescriptionService()->generate($log),
                ]);
            }

            fclose($handle);
        }, 'audit-log.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function exportAuditLogsPdf(Request $request)
    {
        $logs = $this->auditLogsQuery($request)
            ->with('user')
            ->get();

        $pdf = Pdf::loadView('pdf.audit-log', [
            'logs' => $logs,
            'auditDescriptionService' => $this->auditDescriptionService(),
            'userName' => auth()->user()->name,
            'isAdmin' => true,
            'dateRange' => $this->formatDateRange($request),
            'category' => $this->categoryFilter($request),
        ]);

        return $pdf->download('securevault-admin-audit-log.pdf');
    }

    private function auditLogsQuery(Request $request): Builder
    {
        $filters = $this->validatedAuditLogFilters($request);
        $query = AuditLog::with(['user', 'auditable' => fn ($query) => $query->withTrashed()])
            ->orderBy('created_at', $this->direction($request));

        if (($category = $this->categoryFilter($request)) !== 'all') {
            $query->where('category', $category);
        }

        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (! empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }

        if (! empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        if (! empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        } elseif ($request->filled('user')) {
            $query->whereHas('user', function ($query) use ($request) {
                $query->where('name', 'like', '%' . $request->user . '%')
                    ->orWhere('email', 'like', '%' . $request->user . '%');
            });
        }

        return $query;
    }

    /**
     * @return array{action?: string, from_date?: string, to_date?: string, user_id?: int}
     */
    private function validatedAuditLogFilters(Request $request): array
    {
        return $request->validate([
            'action' => ['nullable', 'string', Rule::in($this->auditService->knownActions())],
            'from_date' => ['nullable', 'date_format:Y-m-d'],
            'to_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:from_date'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'user' => ['nullable', 'string', 'max:255'],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'category' => ['nullable', Rule::in(['all', AuditCategory::Security->value, AuditCategory::Audit->value])],
        ]);
    }

    private function categoryFilter(Request $request): string
    {
        $category = $request->input('category', 'all');

        return in_array($category, ['all', AuditCategory::Security->value, AuditCategory::Audit->value], true)
            ? $category
            : 'all';
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

    /**
     * Display all active sessions.
     */
    public function sessions(Request $request, IpInfoService $ipInfoService): Response
    {
        $selectedUser = $request->input('user_id');
        $sessionsWithUsers = DB::table(config('session.table', 'sessions'))
            ->leftJoin('users', 'sessions.user_id', '=', 'users.id')
            ->whereNotNull('sessions.user_id')
            ->when($selectedUser, fn ($query) => $query->where('sessions.user_id', $selectedUser))
            ->orderByDesc('sessions.last_activity')
            ->get([
                'sessions.id',
                'sessions.user_id',
                'sessions.ip_address',
                'sessions.last_activity',
                'sessions.user_agent',
                'users.name as user_name',
                'users.email as user_email',
                'users.avatar_path as user_avatar_path',
            ]);

        return Inertia::render('Admin/Sessions/Index', [
            'sessions' => $sessionsWithUsers->map(fn ($session) => [
                'id' => $session->id,
                'user_id' => $session->user_id,
                'ip_address' => $session->ip_address,
                'last_activity' => $session->last_activity,
                'user_agent' => $session->user_agent,
                'user_name' => $session->user_name,
                'user_email' => $session->user_email,
                'location' => $this->resolveSessionLocation($session->ip_address, $ipInfoService),
                'user_avatar_url' => $session->user_avatar_path
                    ? Storage::disk('public')->url($session->user_avatar_path)
                    : null,
            ]),
            'currentSessionId' => $request->session()->getId(),
            'users' => DB::table(config('session.table', 'sessions'))
                ->join('users', 'sessions.user_id', '=', 'users.id')
                ->select('users.id', 'users.name', 'users.email')
                ->whereNotNull('sessions.user_id')
                ->distinct()
                ->orderBy('users.name')
                ->get()
                ->map(fn ($user) => [
                    'id' => $user->id,
                    'label' => "{$user->name} ({$user->email})",
                ]),
            'selectedUser' => $request->filled('user_id') ? (string) $selectedUser : null,
            'terminableSessionsCount' => DB::table(config('session.table', 'sessions'))
                ->whereNotNull('user_id')
                ->where('id', '!=', $request->session()->getId())
                ->count(),
        ]);
    }

    /**
     * Terminate an active session.
     */
    public function destroySession(string $sessionId): RedirectResponse
    {
        if ($sessionId === session()->getId()) {
            return redirect()->back()->withErrors([
                'session' => 'Cannot terminate your own session.',
            ]);
        }

        DB::table(config('session.table', 'sessions'))
            ->where('id', $sessionId)
            ->delete();

        $this->auditService->log('session_terminated', null, [
            'session_id' => substr($sessionId, 0, 8),
        ]);

        return redirect()->back();
    }

    public function destroyAllSessions(Request $request): RedirectResponse
    {
        $count = DB::table(config('session.table', 'sessions'))
            ->whereNotNull('user_id')
            ->where('id', '!=', $request->session()->getId())
            ->count();

        DB::table(config('session.table', 'sessions'))
            ->whereNotNull('user_id')
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        $this->auditService->log('all_sessions_terminated', null, [
            'count' => $count,
        ]);

        return redirect()->back();
    }

    private function resolveSessionLocation(?string $ipAddress, IpInfoService $ipInfoService): ?string
    {
        if (! is_string($ipAddress) || $ipAddress === '') {
            return null;
        }

        try {
            $info = $ipInfoService->lookup($ipAddress);
            $location = $info['location'] ?? null;

            if (! is_string($location) || $location === '' || $location === 'Unknown location') {
                return null;
            }

            if (($info['country'] ?? null) === 'DEV') {
                return null;
            }

            return $location;
        } catch (\Throwable) {
            return null;
        }
    }
}
