<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditService;
use App\Services\IpInfoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Throwable;

class GoogleOAuthController extends Controller
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly IpInfoService $ipInfo,
    ) {}

    public function redirect(Request $request): RedirectResponse
    {
        if (! $this->oauthConfigured()) {
            return redirect()->route('login')->withErrors([
                'google' => 'Google sign-in is not configured yet.',
            ]);
        }

        $intent = $request->query('intent', 'login');
        $request->session()->put('oauth_intent', $intent === 'link' ? 'link' : 'login');

        return Socialite::driver('google')
            ->scopes(['email', 'profile'])
            ->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $intent = $request->session()->pull('oauth_intent', 'login');

        if ($request->has('error')) {
            $this->audit->logSystem('google_oauth_denied', metadata: [
                'reason' => $request->query('error'),
            ]);

            return $this->redirectWithGoogleError(
                $intent,
                'Google sign-in was cancelled.',
            );
        }

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable $exception) {
            Log::warning('Google OAuth callback failed', [
                'message' => $exception->getMessage(),
            ]);

            $this->audit->logSystem('google_oauth_login_failed', metadata: [
                'reason' => 'callback_exception',
            ]);

            return $this->redirectWithGoogleError(
                $intent,
                'Google sign-in failed. Please try again.',
            );
        }

        return $intent === 'link'
            ? $this->handleLink($googleUser)
            : $this->handleLogin($request, $googleUser);
    }

    public function linkRedirect(Request $request): RedirectResponse
    {
        if (! $this->oauthConfigured()) {
            return redirect()->route('profile.edit')->withErrors([
                'google' => 'Google sign-in is not configured yet.',
            ]);
        }

        $request->session()->put('oauth_intent', 'link');

        return Socialite::driver('google')
            ->scopes(['email', 'profile'])
            ->redirect();
    }

    public function unlink(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'string', 'current_password'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! $user->hasGoogleLinked()) {
            return back()->withErrors([
                'google' => 'No Google account is linked.',
            ]);
        }

        $user->forceFill([
            'google_id' => null,
            'google_avatar' => null,
        ])->save();

        $this->audit->logForUser($user, 'google_oauth_unlinked');

        return redirect()->route('profile.edit')->with('status', 'google-unlinked');
    }

    private function handleLogin(Request $request, object $googleUser): RedirectResponse
    {
        $googleEmail = mb_strtolower((string) $googleUser->getEmail());
        $googleId = (string) $googleUser->getId();

        if ($googleEmail === '' || $googleId === '') {
            $this->audit->logSystem('google_oauth_login_failed', metadata: [
                'reason' => 'missing_google_identity',
            ]);

            return $this->redirectWithGoogleError('login', 'Google did not return a usable account identity.');
        }

        $user = User::query()
            ->where('google_id', $googleId)
            ->first();

        if (! $user) {
            $this->audit->logSystem('google_oauth_login_failed', metadata: [
                'reason' => 'no_matching_google_id',
                'google_email' => $googleEmail,
            ]);

            $userByEmail = User::query()->where('email', $googleEmail)->first();

            if ($userByEmail && ! $userByEmail->hasGoogleLinked()) {
                return redirect()->route('login')->withErrors([
                    'google' => 'This SecureVault account has not linked Google sign-in yet. Sign in with your password first, then link Google from your Profile settings.',
                ]);
            }

            if ($userByEmail && $userByEmail->google_id !== $googleId) {
                return redirect()->route('login')->withErrors([
                    'google' => 'Google sign-in failed. Please sign in with your password or contact support.',
                ]);
            }

            return redirect()
                ->route('register')
                ->with('google_email', $googleEmail)
                ->withErrors([
                    'google' => 'No SecureVault account was found for this Google account. Please register first.',
                ]);
        }

        if (! str_ends_with($googleEmail, '@gmail.com')) {
            $this->audit->logForUser($user, 'google_oauth_login_failed', metadata: [
                'reason' => 'non_gmail_account',
                'google_email' => $googleEmail,
            ]);

            return $this->redirectWithGoogleError('login', 'Only Gmail accounts are supported.');
        }

        if (! $this->isGoogleEmailVerified($googleUser)) {
            $this->audit->logForUser($user, 'google_oauth_login_failed', metadata: [
                'reason' => 'email_not_verified_by_google',
                'google_email' => $googleEmail,
            ]);

            return $this->redirectWithGoogleError('login', 'Your Google email address must be verified before you can use Google sign-in.');
        }

        if (! $user->is_active) {
            $this->audit->logForUser($user, 'google_oauth_login_failed', metadata: [
                'reason' => 'account_inactive',
            ]);

            return $this->redirectWithGoogleError('login', 'Your account has been deactivated.');
        }

        if (mb_strtolower($user->email) !== $googleEmail) {
            $this->audit->logForUser($user, 'google_oauth_login_failed', metadata: [
                'reason' => 'email_mismatch',
                'google_email' => $googleEmail,
            ]);

            return $this->redirectWithGoogleError(
                'login',
                'The Google account email does not match your SecureVault email.',
            );
        }

        Auth::login($user);
        $request->session()->regenerate();

        $user->forceFill([
            'google_avatar' => $googleUser->getAvatar(),
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'last_login_location' => $this->ipInfo->lookup($request->ip())['location'],
        ])->save();

        $request->session()->put('auth.intended_url', redirect()->intended()->getTargetUrl());

        $this->audit->logForUser($user, 'google_oauth_login', metadata: [
            'location' => $user->last_login_location,
            'method' => 'google_oauth',
            'google_email' => $googleEmail,
        ]);

        return redirect()->intended(route('dashboard', absolute: false));
    }

    private function handleLink(object $googleUser): RedirectResponse
    {
        /** @var User|null $user */
        $user = Auth::user();

        if (! $user) {
            return redirect()->route('login');
        }

        $googleEmail = mb_strtolower((string) $googleUser->getEmail());
        $googleId = (string) $googleUser->getId();

        if ($googleEmail === '' || $googleId === '') {
            $this->audit->logForUser($user, 'google_oauth_link_failed', metadata: [
                'reason' => 'missing_google_identity',
            ]);

            return redirect()->route('profile.edit')->withErrors([
                'google' => 'Google did not return a usable account identity.',
            ]);
        }

        if (! str_ends_with($googleEmail, '@gmail.com')) {
            $this->audit->logForUser($user, 'google_oauth_link_failed', metadata: [
                'reason' => 'non_gmail_account',
                'google_email' => $googleEmail,
            ]);

            return redirect()->route('profile.edit')->withErrors([
                'google' => 'Only Gmail accounts are supported.',
            ]);
        }

        if (! $this->isGoogleEmailVerified($googleUser)) {
            $this->audit->logForUser($user, 'google_oauth_link_failed', metadata: [
                'reason' => 'email_not_verified_by_google',
                'google_email' => $googleEmail,
            ]);

            return redirect()->route('profile.edit')->withErrors([
                'google' => 'Your Google email address must be verified before it can be linked.',
            ]);
        }

        if ($googleEmail !== mb_strtolower($user->email)) {
            $this->audit->logForUser($user, 'google_oauth_link_failed', metadata: [
                'reason' => 'email_mismatch',
                'google_email' => $googleEmail,
            ]);

            return redirect()->route('profile.edit')->withErrors([
                'google' => 'The Google account email must match your SecureVault email exactly.',
            ]);
        }

        $conflict = User::query()
            ->where('google_id', $googleId)
            ->where('id', '!=', $user->getKey())
            ->exists();

        if ($conflict) {
            $this->audit->logForUser($user, 'google_oauth_link_failed', metadata: [
                'reason' => 'google_id_already_claimed',
                'google_email' => $googleEmail,
            ]);

            return redirect()->route('profile.edit')->withErrors([
                'google' => 'This Google account is already linked to another SecureVault user.',
            ]);
        }

        if ($user->hasGoogleLinked() && $user->google_id === $googleId) {
            return redirect()->route('profile.edit')->with('status', 'google-already-linked');
        }

        $user->forceFill([
            'google_id' => $googleId,
            'google_avatar' => $googleUser->getAvatar(),
        ])->save();

        $this->audit->logForUser($user, 'google_oauth_linked', metadata: [
            'google_email' => $googleEmail,
        ]);

        return redirect()->route('profile.edit')->with('status', 'google-linked');
    }

    private function oauthConfigured(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'))
            && filled(config('services.google.redirect'));
    }

    private function isGoogleEmailVerified(object $googleUser): bool
    {
        $raw = property_exists($googleUser, 'user') && is_array($googleUser->user)
            ? $googleUser->user
            : [];
        $verified = $raw['verified_email'] ?? $raw['email_verified'] ?? true;

        return filter_var($verified, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? (bool) $verified;
    }

    private function redirectWithGoogleError(string $intent, string $message): RedirectResponse
    {
        $route = $intent === 'link' ? 'profile.edit' : 'login';

        return redirect()->route($route)->withErrors([
            'google' => $message,
        ]);
    }
}
