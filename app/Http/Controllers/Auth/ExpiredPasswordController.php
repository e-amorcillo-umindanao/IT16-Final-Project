<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ExpiredPasswordController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
    ) {
    }

    public function show(): Response
    {
        return Inertia::render('Auth/PasswordExpired', [
            'expiryDays' => config('securevault.password_expiry_days', 90),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => [
                'required',
                'confirmed',
                Password::defaults(),
            ],
        ]);

        $user = $request->user();

        $user->update([
            'password' => Hash::make($request->string('password')->toString()),
            'password_changed_at' => now(),
        ]);

        $this->auditService->log('password_changed', $user, [
            'reason' => 'expired_policy',
        ]);

        return redirect()->route('dashboard');
    }
}
