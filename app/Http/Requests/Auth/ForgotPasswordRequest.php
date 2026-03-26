<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\RecaptchaValidatable;
use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    use RecaptchaValidatable;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            ...$this->recaptchaRules(),
        ];
    }
}
