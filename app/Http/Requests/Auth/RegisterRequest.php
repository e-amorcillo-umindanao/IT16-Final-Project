<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\RecaptchaValidatable;
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
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                'unique:users',
                'ends_with:@gmail.com',
            ],
            'password' => [
                'required',
                'confirmed',
                Rules\Password::defaults(),
            ],
            ...$this->recaptchaRules(),
        ];
    }

    public function messages(): array
    {
        return [
            'email.ends_with' => 'Registration is currently limited to Gmail addresses (@gmail.com).',
        ];
    }
}
