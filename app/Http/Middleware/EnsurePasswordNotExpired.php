<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordNotExpired
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->isSystemAccount()) {
            return $next($request);
        }

        if ($user && $user->isPasswordExpired()) {
            if ($request->routeIs('password.expired') || $request->routeIs('password.expired.update')) {
                return $next($request);
            }

            return redirect()->route('password.expired');
        }

        return $next($request);
    }
}
