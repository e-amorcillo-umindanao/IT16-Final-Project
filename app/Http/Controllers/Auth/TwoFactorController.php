<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    protected $google2fa;
    protected $auditService;

    public function __construct(Google2FA $google2fa, AuditService $auditService)
    {
        $this->google2fa = $google2fa;
        $this->auditService = $auditService;
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

        $qrCodeUrl = $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secret
        );

        return Inertia::render('Auth/TwoFactorSetup', [
            'qrCodeUrl' => $qrCodeUrl,
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

        if (!$secret || !$this->google2fa->verifyKey($secret, $request->code)) {
            return back()->withErrors(['code' => 'The provided verification code was invalid.']);
        }

        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_enabled' => true,
        ]);

        $request->session()->forget('2fa_setup_secret');
        $request->session()->put('2fa_verified', true);

        $this->auditService->log('2fa_enabled', $user);

        return redirect()->route('profile.edit')->with('status', 'two-factor-enabled');
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

        $user->update([
            'two_factor_secret' => null,
            'two_factor_enabled' => false,
        ]);

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

        return Inertia::render('Auth/TwoFactorChallenge');
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

        if (!$this->google2fa->verifyKey($user->two_factor_secret, $request->code)) {
            $this->auditService->log('2fa_failed', $user);
            return back()->withErrors(['code' => 'The provided verification code was invalid.']);
        }

        $request->session()->put('2fa_verified', true);
        
        $intendedUrl = $request->session()->pull('auth.intended_url', route('dashboard'));

        return redirect()->to($intendedUrl);
    }
}
