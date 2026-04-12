<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecaptchaService
{
    public const UNAVAILABLE_SENTINEL = '__recaptcha_unavailable__';

    public function verify(?string $token, string $action = ''): bool
    {
        if (! $this->enabled()) {
            return true;
        }

        $normalizedToken = is_string($token) ? trim($token) : null;

        if ($normalizedToken === self::UNAVAILABLE_SENTINEL) {
            Log::warning('reCAPTCHA token unavailable. Failing open.', [
                'action' => $action ?: 'unknown',
                'ip' => request()->ip(),
                'reason' => 'client_unavailable_sentinel',
            ]);

            return true;
        }

        if (! is_string($token) || $normalizedToken === '') {
            return false;
        }

        try {
            $response = Http::asForm()
                ->timeout(5)
                ->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => config('services.recaptcha.secret_key'),
                    'response' => $normalizedToken,
                ]);

            if (! $response->successful()) {
                Log::error('reCAPTCHA: HTTP request failed.', [
                    'status' => $response->status(),
                    'action' => $action ?: 'unknown',
                ]);

                return true;
            }

            $data = $response->json();

            if (! ($data['success'] ?? false)) {
                Log::warning('reCAPTCHA verification failed', [
                    'error-codes' => $data['error-codes'] ?? [],
                    'action' => $action ?: 'unknown',
                ]);

                app(AuditService::class)->log('bot_detected', null, [
                    'form_action' => $action ?: 'unknown',
                    'error_codes' => $data['error-codes'] ?? [],
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('reCAPTCHA service unavailable', [
                'message' => $e->getMessage(),
                'action' => $action ?: 'unknown',
            ]);

            return true;
        }
    }

    public function enabled(): bool
    {
        return filled(config('services.recaptcha.site_key'))
            && filled(config('services.recaptcha.secret_key'));
    }
}
