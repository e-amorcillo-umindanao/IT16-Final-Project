<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\RecaptchaValidatable;
use App\Services\IpInfoService;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    use RecaptchaValidatable;

    public const RECAPTCHA_AFTER_FAILED_ATTEMPTS = 3;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            ...$this->recaptchaRules(),
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        if ($this->requiresRecaptchaChallenge() && ! $this->verifyRecaptcha('login')) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'recaptcha_token' => 'Bot verification failed. Please confirm the checkbox and try again.',
            ]);
        }

        $user = \App\Models\User::where('email', $this->email)->first();
        $auditService = app(\App\Services\AuditService::class);
        $location = app(IpInfoService::class)->lookup($this->ip())['location'] ?? 'Unknown location';

        // 1. Pre-auth Checks
        if ($user) {
            if (!$user->is_active) {
                $auditService->log('login_blocked_inactive', null, ['email' => $this->email]);
                throw ValidationException::withMessages([
                    'email' => 'Your account has been deactivated.',
                ]);
            }

            if ($user->isLockedOut()) {
                $minutes = now()->diffInMinutes($user->locked_until);
                throw ValidationException::withMessages([
                    'email' => "Your account is locked. Try again in {$minutes} minutes.",
                ]);
            }
        }

        // 2. Auth Attempt
        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());

            if ($user) {
                $user->incrementFailedLogins();
                
                if ($user->failed_login_attempts >= 10) {
                    $user->lockAccount(15);
                    $auditService->log('account_locked', $user, [
                        'email' => $this->email,
                        'location' => $location,
                    ]);
                }
            }

            $auditService->log('login_failed', null, [
                'email' => $this->email,
                'location' => $location,
            ]);

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        // 3. Success Logic
        $user = Auth::user();
        $user->resetFailedLogins();
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $this->ip(),
        ]);

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return self::throttleKeyFor((string) $this->string('email'), (string) $this->ip());
    }

    public function requiresRecaptchaChallenge(): bool
    {
        return RateLimiter::attempts($this->throttleKey()) >= self::RECAPTCHA_AFTER_FAILED_ATTEMPTS;
    }

    public static function throttleKeyFor(string $email, string $ip): string
    {
        return Str::transliterate(Str::lower($email).'|'.$ip);
    }
}
