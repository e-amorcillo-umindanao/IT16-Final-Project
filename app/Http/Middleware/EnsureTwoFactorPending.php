<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTwoFactorPending
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->two_factor_enabled) {
            return redirect()->route('dashboard');
        }

        if ($request->session()->get('2fa_verified')
            && ($request->isMethod('GET') || $request->routeIs('two-factor.challenge', 'two-factor.recovery'))) {
            return redirect()->route('dashboard');
        }

        return $next($request);
    }
}
