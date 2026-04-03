<?php

namespace App\Http\Controllers;

use App\Services\AuditService;
use App\Services\IpInfoService;
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
    public function index(Request $request, IpInfoService $ipInfoService): Response
    {
        $sessions = DB::connection(config('session.connection'))
            ->table(config('session.table', 'sessions'))
            ->where('user_id', $request->user()->id)
            ->orderByDesc('last_activity')
            ->get(['id', 'ip_address', 'last_activity', 'user_agent']);

        return Inertia::render('Sessions/Index', [
            'sessions' => $sessions->map(fn ($session) => [
                'id' => $session->id,
                'ip_address' => $session->ip_address,
                'last_activity' => $session->last_activity,
                'user_agent' => $session->user_agent,
                'location' => $this->resolveSessionLocation($session->ip_address, $ipInfoService),
            ]),
            'currentSessionId' => $request->session()->getId(),
        ]);
    }

    /**
     * Revoke an active session.
     */
    public function destroy(Request $request, string $sessionId): RedirectResponse
    {
        if ($sessionId === $request->session()->getId()) {
            return redirect()->back()->withErrors([
                'session' => 'Cannot revoke current session.',
            ]);
        }

        DB::connection(config('session.connection'))
            ->table(config('session.table', 'sessions'))
            ->where('id', $sessionId)
            ->where('user_id', $request->user()->id)
            ->delete();

        $this->auditService->log('session_revoked', null, [
            'session_id' => substr($sessionId, 0, 8),
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
