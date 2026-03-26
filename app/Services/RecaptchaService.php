<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RecaptchaService
{
    public const UNAVAILABLE_SENTINEL = '__recaptcha_unavailable__';

    public function verify(?string $token, string $action): bool
    {
        if (!$this->enabled()) {
            return true;
        }

        $normalizedToken = is_string($token) ? trim($token) : null;

        if (
            !is_string($token)
            || $normalizedToken === ''
            || $normalizedToken === self::UNAVAILABLE_SENTINEL
        ) {
            Log::warning('reCAPTCHA token unavailable. Failing open.', [
                'action' => $action,
                'ip' => request()->ip(),
                'reason' => $normalizedToken === self::UNAVAILABLE_SENTINEL
                    ? 'client_unavailable_sentinel'
                    : 'missing_token',
            ]);

            return true;
        }

        try {
            $response = Http::asForm()
                ->timeout(5)
                ->post('https://www.google.com/recaptcha/api/siteverify', [
                    'secret' => config('services.recaptcha.secret_key'),
                    'response' => $normalizedToken,
                ]);

            $data = $response->json();

            if (!($data['success'] ?? false)) {
                Log::warning('reCAPTCHA verification failed', [
                    'error-codes' => $data['error-codes'] ?? [],
                    'action' => $action,
                ]);

                return false;
            }

            if (($data['action'] ?? '') !== $action) {
                Log::warning('reCAPTCHA action mismatch', [
                    'expected' => $action,
                    'received' => $data['action'] ?? 'none',
                ]);

                return false;
            }

            $score = (float) ($data['score'] ?? 0.0);
            $threshold = (float) config('services.recaptcha.threshold', 0.5);

            if ($score < $threshold) {
                Log::warning('reCAPTCHA score below threshold', [
                    'score' => $score,
                    'threshold' => $threshold,
                    'action' => $action,
                ]);

                app(AuditService::class)->log('bot_detected', null, [
                    'form_action' => $action,
                    'score' => $score,
                    'threshold' => $threshold,
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('reCAPTCHA service unavailable', [
                'message' => $e->getMessage(),
                'action' => $action,
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
