<?php

namespace App\Http\Requests;

trait RecaptchaValidatable
{
    protected function recaptchaRules(): array
    {
        return [
            'recaptcha_token' => ['nullable', 'string'],
        ];
    }

    public function verifyRecaptcha(string $action = ''): bool
    {
        return app(\App\Services\RecaptchaService::class)
            ->verify($this->input('recaptcha_token'), $action);
    }
}
