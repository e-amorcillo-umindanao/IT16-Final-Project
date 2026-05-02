<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Models\DataExport;
use App\Services\AuditService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $recentExports = DataExport::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', now()->subDay())
            ->whereIn('status', ['pending', 'ready'])
            ->latest()
            ->get();

        $recentExports->each(function (DataExport $export): void {
            if ($export->status === 'ready' && ! $export->isDownloadReady()) {
                $export->update([
                    'status' => 'expired',
                ]);

                $export->status = 'expired';
            }
        });

        $latestExport = DataExport::query()
            ->where('user_id', $user->id)
            ->latest()
            ->first();

        if ($latestExport?->status === 'ready' && ! $latestExport->isDownloadReady()) {
            $latestExport->update([
                'status' => 'expired',
            ]);

            $latestExport->status = 'expired';
        }
        $sessionCount = DB::table('sessions')
            ->where('user_id', $user->id)
            ->count();

        $recentSessions = DB::table('sessions')
            ->where('user_id', $user->id)
            ->orderByDesc('last_activity')
            ->limit(3)
            ->get(['id', 'ip_address', 'last_activity']);

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'two_factor_enabled' => (bool) $user->two_factor_enabled,
            'recovery_codes_remaining' => $user->twoFactorRecoveryCodes()->whereNull('used_at')->count(),
            'googleLinked' => $user->hasGoogleLinked(),
            'googleOAuthEnabled' => filled(config('services.google.client_id'))
                && filled(config('services.google.client_secret'))
                && filled(config('services.google.redirect')),
            'has_pending_export' => $recentExports->contains(
                fn (DataExport $export) => $export->status === 'pending' || $export->isDownloadReady(),
            ),
            'latest_export' => $latestExport ? [
                'status' => $latestExport->status,
                'expires_at' => $latestExport->expires_at?->toIso8601String(),
                'download_url' => $latestExport->isDownloadReady()
                        ? URL::temporarySignedRoute(
                            'exports.download',
                            $latestExport->expires_at,
                            ['token' => $latestExport->token],
                        )
                        : null,
            ] : null,
            'session_count' => $sessionCount,
            'recent_sessions' => $recentSessions->map(fn ($session) => [
                'id' => $session->id,
                'ip_address' => $session->ip_address,
                'last_activity' => $session->last_activity,
                'is_current' => $session->id === $request->session()->getId(),
            ]),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request, AuditService $auditService): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();
        $emailChanged = $user->email !== $validated['email'];

        $user->forceFill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'email_verified_at' => $emailChanged ? null : $user->email_verified_at,
        ])->save();

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
        }

        $auditService->log('profile_updated', $user);

        return Redirect::route('profile.edit');
    }

    /**
     * Update the user's password.
     */
    public function updatePassword(Request $request, AuditService $auditService): RedirectResponse
    {
        $validatedCurrentPassword = $request->validate([
            'current_password' => ['required'],
        ]);

        $user = $request->user();

        if (!Hash::check($validatedCurrentPassword['current_password'], $user->password)) {
            return Redirect::back()->withErrors([
                'current_password' => 'The current password is incorrect.',
            ]);
        }

        $validator = Validator::make($request->all(), [
            'password' => [
                'required',
                'confirmed',
                Password::defaults(),
            ],
        ]);

        $validator->after(function ($validator) use ($request) {
            if ($request->filled('password')
                && $request->filled('password_confirmation')
                && $request->input('password') !== $request->input('password_confirmation')) {
                $messages = $validator->errors()->get('password');

                foreach ($messages as $message) {
                    if (str_contains(strtolower($message), 'confirmation')) {
                        $validator->errors()->add('password_confirmation', $message);
                        break;
                    }
                }
            }
        });

        $validated = $validator->validate();

        $user->update([
            'password' => Hash::make($validated['password']),
            'password_changed_at' => now(),
        ]);

        $auditService->log('password_changed', $user);

        return Redirect::route('profile.edit');
    }

    /**
     * Disable two-factor authentication for the user.
     */
    public function destroyTwoFactor(Request $request, AuditService $auditService): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        $user->twoFactorRecoveryCodes()->delete();

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_enabled' => false,
        ])->save();

        $request->session()->forget('2fa_verified');
        $auditService->log('2fa_disabled', $user);

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
