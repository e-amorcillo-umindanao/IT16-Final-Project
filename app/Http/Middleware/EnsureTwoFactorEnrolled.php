<?php

namespace App\Http\Middleware;

use App\Services\AuditService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTwoFactorEnrolled
{
    private const EXEMPT_ROUTES = [
        'two-factor.setup',
        'two-factor.enable',
        'logout',
    ];

    public function __construct(
        private readonly AuditService $auditService,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($user->isSystemAccount()) {
            return $next($request);
        }

        if ($user->two_factor_enabled) {
            return $next($request);
        }

        if (is_null($user->two_factor_deadline)) {
            $deadline = now()->addDays(3);

            $user->update([
                'two_factor_deadline' => $deadline,
            ]);

            $this->auditService->log('two_factor_deadline_set', metadata: [
                'deadline' => $deadline->toIso8601String(),
                'source' => 'legacy_account_first_encounter',
            ]);

            return $next($request);
        }

        if (now()->lessThanOrEqualTo($user->two_factor_deadline)) {
            return $next($request);
        }

        $routeName = $request->route()?->getName();

        if ($routeName !== null && in_array($routeName, self::EXEMPT_ROUTES, true)) {
            return $next($request);
        }

        return redirect()
            ->route('two-factor.setup')
            ->with('2fa_required', true);
    }
}
