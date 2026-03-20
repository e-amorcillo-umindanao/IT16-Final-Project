<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Document;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    protected $auditService;

    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Display the admin dashboard with security metrics.
     */
    public function dashboard(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'total_users' => User::count(),
                'active_users' => User::where('is_active', true)->count(),
                'active_sessions' => DB::table(config('session.table', 'sessions'))
                    ->whereNotNull('user_id')
                    ->count(),
                'total_documents' => Document::whereNull('deleted_at')->count(),
                'vault_storage' => Document::whereNull('deleted_at')->sum('file_size'),
                'failed_logins_24h' => AuditLog::where('action', 'login_failed')
                    ->where('created_at', '>=', now()->subHours(24))
                    ->count(),
                'pending_verifications' => User::whereNull('email_verified_at')->count(),
            ],
            'recent_activity' => AuditLog::with('user')
                ->orderByDesc('created_at')
                ->limit(10)
                ->get()
                ->map(fn ($log) => [
                    'action' => $log->action,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at,
                    'user' => $log->user ? [
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                    ] : null,
                ]),
        ]);
    }

    /**
     * Display a listing of all users.
     */
    public function users(Request $request): Response
    {
        $query = User::with('roles')
            ->orderBy('name');

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

        return Inertia::render('Admin/Users/Index', [
            'users' => $query->paginate(15)->withQueryString()
                ->through(fn ($user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_active' => $user->is_active,
                    'last_login_at' => $user->last_login_at,
                    'last_login_ip' => $user->last_login_ip,
                    'role' => $user->roles->first()?->name ?? 'user',
                ]),
            'filters' => $request->only(['search', 'role', 'status']),
        ]);
    }

    /**
     * Activate a user account.
     */
    public function activateUser(User $user): RedirectResponse
    {
        $user->update(['is_active' => true]);

        $this->auditService->log('user_activated', $user);

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

        $user->syncRoles([$request->role]);

        $this->auditService->log('user_role_changed', $user, [
            'new_role' => $request->role,
        ]);

        return back()->with('success', 'User role updated successfully.');
    }

    public function exportUsers()
    {
        $users = User::with('roles')->orderBy('name')->get();
        $csv = "Name,Email,Role,Status,Last Login,Registered\n";

        foreach ($users as $user) {
            $csv .= implode(',', [
                '"' . str_replace('"', '""', $user->name) . '"',
                $user->email,
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
        $query = $this->auditLogsQuery($request);

        return Inertia::render('Admin/AuditLogs/Index', [
            'logs' => $query
                ->paginate(15)
                ->withQueryString()
                ->through(fn (AuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'metadata' => $log->metadata,
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at,
                    'auditable' => $log->auditable ? [
                        'original_name' => $log->auditable->original_name ?? null,
                    ] : null,
                    'user' => $log->user ? [
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                    ] : null,
                ]),
            'filters' => $request->only(['action', 'from_date', 'to_date', 'user']),
        ]);
    }

    public function exportAuditLogs(Request $request)
    {
        $logs = $this->auditLogsQuery($request)->get([
            'action',
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
                    json_encode($log->metadata),
                ]);
            }

            fclose($handle);
        }, 'audit-log.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function auditLogsQuery(Request $request)
    {
        $query = AuditLog::with(['user', 'auditable' => fn ($query) => $query->withTrashed()])
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

        if ($request->filled('user')) {
            $query->whereHas('user', function ($query) use ($request) {
                $query->where('name', 'like', '%' . $request->user . '%')
                    ->orWhere('email', 'like', '%' . $request->user . '%');
            });
        }

        return $query;
    }

    /**
     * Display a read-only list of all documents in the system.
     */
    public function documents(Request $request): Response
    {
        $query = Document::with('user:id,name,email')
            ->latest();

        if ($request->search) {
            $search = $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('original_name', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        return Inertia::render('Admin/Documents', [
            'documents' => $query->paginate(20)->withQueryString(),
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Display all active sessions.
     */
    public function sessions(Request $request): Response
    {
        $sessionsWithUsers = DB::table(config('session.table', 'sessions'))
            ->leftJoin('users', 'sessions.user_id', '=', 'users.id')
            ->whereNotNull('sessions.user_id')
            ->orderByDesc('sessions.last_activity')
            ->get([
                'sessions.id',
                'sessions.ip_address',
                'sessions.last_activity',
                'sessions.user_agent',
                'users.name as user_name',
                'users.email as user_email',
            ]);

        return Inertia::render('Admin/Sessions/Index', [
            'sessions' => $sessionsWithUsers->map(fn ($session) => [
                'id' => $session->id,
                'ip_address' => $session->ip_address,
                'last_activity' => $session->last_activity,
                'user_agent' => $session->user_agent,
                'user_name' => $session->user_name,
                'user_email' => $session->user_email,
            ]),
            'currentSessionId' => $request->session()->getId(),
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
}
