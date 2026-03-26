<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\RecaptchaValidatable;
use App\Rules\NotPwnedPassword;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules;

class RegisterRequest extends FormRequest
{
    use RecaptchaValidatable;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
            'password' => [
                'required',
                'confirmed',
                Rules\Password::min(8)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
                new NotPwnedPassword(),
            ],
            ...$this->recaptchaRules(),
        ];
    }
}
