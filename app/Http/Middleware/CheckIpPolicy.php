<?php

namespace App\Http\Middleware;

use App\Services\AuditService;
use App\Services\IpPolicyService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class CheckIpPolicy
{
    public function __construct(
        private readonly IpPolicyService $ipPolicy,
        private readonly AuditService $auditService,
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $ip = $request->ip() ?? '0.0.0.0';

        try {
            $isAllowed = $this->ipPolicy->isAllowed($ip);
        } catch (\Throwable $exception) {
            Log::error('IpPolicyService error', [
                'ip' => $ip,
                'error' => $exception->getMessage(),
            ]);

            return $next($request);
        }

        if (! $isAllowed) {
            $this->auditService->log('access_blocked_ip', metadata: [
                'ip' => $ip,
                'path' => $request->path(),
            ]);

            abort(403, 'Access denied by IP policy.');
        }

        return $next($request);
    }
}
