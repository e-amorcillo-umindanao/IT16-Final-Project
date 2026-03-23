<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureTwoFactor
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->two_factor_enabled) {
            if (!$user->hasTwoFactorSecretValid()) {
                $user->update([
                    'two_factor_secret' => null,
                    'two_factor_enabled' => false,
                ]);

                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')->withErrors([
                    'email' => 'Your two-factor authentication setup was invalid and has been reset. Please log in and re-enable 2FA from your profile settings.',
                ]);
            }

            if (!$request->session()->get('2fa_verified')) {
                $request->session()->put('auth.intended_url', $request->url());

                return redirect()->route('two-factor.challenge');
            }
        }

        return $next($request);
    }
}
