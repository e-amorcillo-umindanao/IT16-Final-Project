<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\RecoveryCodeService;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    public function __construct(
        protected Google2FA $google2fa,
        protected AuditService $auditService,
        protected RecoveryCodeService $recoveryCodeService,
    ) {
    }

    /**
     * Display the 2FA setup page.
     */
    public function setup(Request $request): Response
    {
        $user = $request->user();
        
        if ($user->two_factor_enabled) {
            return Inertia::render('Profile/Edit', [
                'status' => 'Two-factor authentication is already enabled.',
            ]);
        }

        $secret = $this->google2fa->generateSecretKey();
        $request->session()->put('2fa_setup_secret', $secret);

        $otpauthUrl = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret
        );

        return Inertia::render('Auth/TwoFactorSetup', [
            'otpauthUrl' => $otpauthUrl,
            'secret' => $secret,
        ]);
    }

    /**
     * Enable 2FA for the user.
     */
    public function enable(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => 'required|digits:6',
        ]);

        $user = $request->user();
        $secret = $request->session()->get('2fa_setup_secret');

        if (empty($secret) || strlen($secret) < 16) {
            return redirect()->route('two-factor.setup')->withErrors([
                'code' => 'Your setup session has expired. Please scan the QR code again.',
            ]);
        }

        if (!$this->google2fa->verifyKey($secret, $request->code)) {
            return back()->withErrors(['code' => 'The provided verification code was invalid.']);
        }

        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_enabled' => true,
        ]);

        $request->session()->forget('2fa_setup_secret');
        $request->session()->put('2fa_verified', true);
        $codes = $this->recoveryCodeService->generate($user);

        $this->auditService->log('2fa_enabled', $user);

        return redirect()
            ->route('profile.edit')
            ->with('success', 'Two-factor authentication enabled.')
            ->with('recovery_codes', $codes);
    }

    /**
     * Disable 2FA for the user.
     */
    public function disable(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => 'required|current_password',
        ]);

        $user = $request->user();

        if ($user->two_factor_enabled || !empty($user->two_factor_secret)) {
            $user->update([
                'two_factor_secret' => null,
                'two_factor_enabled' => false,
            ]);
        }

        $user->twoFactorRecoveryCodes()->delete();

        $request->session()->forget('2fa_verified');

        $this->auditService->log('2fa_disabled', $user);

        return back()->with('status', 'two-factor-disabled');
    }

    /**
     * Display the 2FA challenge page.
     */
    public function challenge(Request $request): Response|RedirectResponse
    {
        $user = Auth::user();

        if (!$user || !$user->two_factor_enabled) {
            return redirect()->intended(route('dashboard'));
        }

        if (!$user->hasTwoFactorSecretValid()) {
            $user->update([
                'two_factor_secret' => null,
                'two_factor_enabled' => false,
            ]);

            $request->session()->forget('2fa_verified');

            $this->auditService->log('2fa_corrupt_reset', $user, [
                'reason' => 'two_factor_secret was null or too short during challenge',
            ]);

            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'email' => 'Your two-factor authentication setup is invalid and has been reset. Please log in again and re-enable 2FA from your profile settings.',
            ]);
        }

        return Inertia::render('Auth/TwoFactorChallenge');
    }

    public function showRecoveryForm(): Response
    {
        return Inertia::render('Auth/TwoFactorRecovery');
    }

    public function verifyRecoveryCode(Request $request): RedirectResponse
    {
        $request->validate([
            'recovery_code' => ['required', 'string'],
        ]);

        $user = Auth::user();

        if (! $user || ! $this->recoveryCodeService->consume($user, $request->string('recovery_code')->toString())) {
            if ($user) {
                $this->auditService->log('recovery_code_failed', $user);
            }

            return back()->withErrors([
                'recovery_code' => 'Invalid or already-used recovery code.',
            ]);
        }

        $remainingCodes = $this->recoveryCodeService->remainingCount($user);

        $request->session()->put('2fa_verified', true);
        $this->auditService->log('recovery_code_used', $user, [
            'remaining_codes' => $remainingCodes,
        ]);

        if ($remainingCodes <= 2) {
            $request->session()->put('recovery_codes_low', true);
        }

        $intendedUrl = $request->session()->pull('auth.intended_url', route('dashboard'));

        return redirect()->to($intendedUrl);
    }

    public function regenerateCodes(Request $request): RedirectResponse
    {
        $user = $request->user();
        $codes = $this->recoveryCodeService->generate($user);

        $this->auditService->log('recovery_codes_regenerated', $user);

        return redirect()
            ->route('profile.edit')
            ->with('success', 'Recovery codes regenerated.')
            ->with('recovery_codes', $codes);
    }

    /**
     * Verify the 2FA code.
     */
    public function verify(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => 'required|digits:6',
        ]);

        $user = Auth::user();

        if (!$user->hasTwoFactorSecretValid()) {
            $user->update([
                'two_factor_secret' => null,
                'two_factor_enabled' => false,
            ]);

            $request->session()->forget('2fa_verified');

            $this->auditService->log('2fa_corrupt_reset', $user, [
                'reason' => 'two_factor_secret was null or too short during verify',
            ]);

            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'code' => 'Your two-factor authentication setup is invalid and has been reset. Please log in again and re-enable 2FA from your profile settings.',
            ]);
        }

        if (!$this->google2fa->verifyKey($user->two_factor_secret, $request->code)) {
            $this->auditService->log('2fa_failed', $user);
            return back()->withErrors(['code' => 'The provided verification code was invalid.']);
        }

        $request->session()->put('2fa_verified', true);
        $this->auditService->log('2fa_verified', $user);

        $intendedUrl = $request->session()->pull('auth.intended_url', route('dashboard'));

        return redirect()->to($intendedUrl);
    }
}
