<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\IpInfoService;
use App\Services\AuditService;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        $email = (string) request()->session()->getOldInput('email', '');
        $requiresRecaptcha = $email !== ''
            && RateLimiter::attempts(LoginRequest::throttleKeyFor($email, request()->ip())) >= LoginRequest::RECAPTCHA_AFTER_FAILED_ATTEMPTS;

        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
            'requiresRecaptcha' => $requiresRecaptcha,
            'googleOAuthEnabled' => filled(config('services.google.client_id'))
                && filled(config('services.google.client_secret'))
                && filled(config('services.google.redirect')),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = Auth::user();

        // Enrich with IP location
        $ipData = app(IpInfoService::class)->lookup($request->ip());
        $location = $ipData['location'];

        app(AuditService::class)->log('login_success', $user, [
            'location'   => $location,
            'two_factor' => $user->two_factor_enabled,
        ]);

        $user->update([
            'last_login_at'       => now(),
            'last_login_ip'       => $request->ip(),
            'last_login_location' => $location,
        ]);

        if ($user && $user->two_factor_enabled) {
            $request->session()->put('auth.intended_url', redirect()->intended()->getTargetUrl());
            return redirect()->route('two-factor.challenge');
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $user = Auth::user();
        if ($user) {
            app(\App\Services\AuditService::class)->log('logout', $user);
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
