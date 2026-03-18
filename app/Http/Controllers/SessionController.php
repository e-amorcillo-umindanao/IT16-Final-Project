<?php

namespace App\Http\Controllers;

use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SessionController extends Controller
{
    protected $auditService;

    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Display a listing of the active sessions.
     */
    public function index(Request $request): Response
    {
        $sessions = DB::connection(config('session.connection'))
            ->table(config('session.table', 'sessions'))
            ->where('user_id', $request->user()->id)
            ->orderBy('last_activity', 'desc')
            ->get();

        return Inertia::render('Sessions/Index', [
            'sessions' => $sessions->map(function ($session) use ($request) {
                return [
                    'id' => $session->id,
                    'ip_address' => $session->ip_address,
                    'user_agent' => $session->user_agent,
                    'last_activity' => $session->last_activity,
                    'is_current_session' => $session->id === $request->session()->getId(),
                ];
            }),
        ]);
    }

    /**
     * Revoke an active session.
     */
    public function destroy(Request $request, string $sessionId): RedirectResponse
    {
        /** @var \stdClass|null $session */
        $session = DB::connection(config('session.connection'))
            ->table(config('session.table', 'sessions'))
            ->where('user_id', $request->user()->id)
            ->where('id', $sessionId)
            ->first();

        if ($session) {
            DB::connection(config('session.connection'))
                ->table(config('session.table', 'sessions'))
                ->where('id', $sessionId)
                ->delete();

            $this->auditService->log('session_revoked', $request->user(), [
                'session_id' => $sessionId,
                'ip_address' => $session->ip_address,
            ]);
        }

        return back()->with('status', 'session-revoked');
    }
}
