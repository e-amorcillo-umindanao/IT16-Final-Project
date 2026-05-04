<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar_url' => $user->avatar_url,
                    'google_linked' => $user->hasGoogleLinked(),
                    'two_factor_enabled' => (bool) $user->two_factor_enabled,
                    'two_factor_deadline' => $user->two_factor_deadline?->toIso8601String(),
                    'last_login_at' => $user->last_login_at?->toIso8601String(),
                    'last_login_ip' => $user->last_login_ip,
                ] : null,
                'roles' => $user?->getRoleNames() ?? [],
                'permissions' => $user?->getAllPermissions()->pluck('name')->values() ?? [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success') ?? $request->session()->get('status'),
                'error' => fn () => $request->session()->get('error'),
                'recovery_codes' => fn () => $request->session()->get('recovery_codes'),
            ],
            'recaptchaSiteKey' => config('services.recaptcha.site_key'),
            'ziggy' => fn () => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
        ];
    }
}
