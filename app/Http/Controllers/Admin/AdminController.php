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
use Spatie\Permission\Models\Role;

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
        $stats = [
            'total_users' => User::count(),
            'active_users' => User::where('is_active', true)->count(),
            'total_documents' => Document::count(),
            'total_storage' => (int) Document::sum('file_size'),
            'failed_logins_24h' => AuditLog::where('action', 'login_failed')
                ->where('created_at', '>', now()->subDay())
                ->count(),
            'active_sessions' => DB::table(config('session.table', 'sessions'))->count(),
        ];

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
        ]);
    }

    /**
     * Display a listing of all users.
     */
    public function users(Request $request): Response
    {
        $query = User::with('roles')
            ->orderBy('name');

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        return Inertia::render('Admin/Users', [
            'users' => $query->paginate(20)->withQueryString(),
            'roles' => Role::all(),
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Toggle a user's active status.
     */
    public function toggleUserActive(User $user): RedirectResponse
    {
        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'You cannot deactivate your own account.']);
        }

        $user->update(['is_active' => !$user->is_active]);

        // If deactivating, purge sessions
        if (!$user->is_active) {
            DB::table(config('session.table', 'sessions'))
                ->where('user_id', $user->id)
                ->delete();
        }

        $this->auditService->log('user_status_changed', $user, [
            'new_status' => $user->is_active ? 'active' : 'inactive',
        ]);

        return back()->with('status', 'user-status-updated');
    }

    /**
     * Update a user's role.
     */
    public function updateUserRole(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'role' => 'required|exists:roles,name',
        ]);

        if ($user->id === auth()->id()) {
            return back()->withErrors(['error' => 'You cannot change your own role.']);
        }

        $oldRoles = $user->getRoleNames()->toArray();
        $user->syncRoles([$request->role]);

        $this->auditService->log('user_role_changed', $user, [
            'old_roles' => $oldRoles,
            'new_role' => $request->role,
        ]);

        return back()->with('status', 'user-role-updated');
    }

    /**
     * Display system-wide audit logs.
     */
    public function auditLogs(Request $request): Response
    {
        $query = AuditLog::with(['user', 'auditable' => fn($q) => $q->withTrashed()])
            ->latest('id');

        // Advanced Filters
        if ($request->search_user) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search_user}%")
                  ->orWhere('email', 'like', "%{$request->search_user}%");
            });
        }

        if ($request->action) {
            $query->where('action', $request->action);
        }

        if ($request->date_from) {
            $query->where('created_at', '>=', $request->date_from . ' 00:00:00');
        }

        if ($request->date_to) {
            $query->where('created_at', '<=', $request->date_to . ' 23:59:59');
        }

        if ($request->ip_address) {
            $query->where('ip_address', 'like', "%{$request->ip_address}%");
        }

        return Inertia::render('Admin/AuditLogs', [
            'logs' => $query->paginate(50)->withQueryString(),
            'actionTypes' => AuditLog::distinct()->pluck('action')->toArray(),
            'filters' => $request->only(['search_user', 'action', 'date_from', 'date_to', 'ip_address']),
        ]);
    }

    /**
     * Display all active sessions.
     */
    public function sessions(): Response
    {
        $sessions = DB::table(config('session.table', 'sessions'))
            ->get();

        // Map session user_id to user names manually or through a join
        // For simplicity and efficiency in a security app, we'll join
        $sessionsWithUsers = DB::table(config('session.table', 'sessions'))
            ->leftJoin('users', 'sessions.user_id', '=', 'users.id')
            ->select('sessions.*', 'users.name as user_name', 'users.email as user_email')
            ->orderBy('last_activity', 'desc')
            ->get();

        return Inertia::render('Admin/Sessions', [
            'sessions' => $sessionsWithUsers,
        ]);
    }

    /**
     * Terminate an active session.
     */
    public function destroySession(string $sessionId): RedirectResponse
    {
        /** @var \stdClass|null $session */
        $session = DB::table(config('session.table', 'sessions'))
            ->where('id', $sessionId)
            ->first();

        if ($session) {
            DB::table(config('session.table', 'sessions'))
                ->where('id', $sessionId)
                ->delete();

            $this->auditService->log('admin_session_terminated', null, [
                'session_id' => $sessionId,
                'target_user_id' => $session->user_id,
                'ip_address' => $session->ip_address,
            ]);
        }

        return back()->with('status', 'session-terminated');
    }
}
