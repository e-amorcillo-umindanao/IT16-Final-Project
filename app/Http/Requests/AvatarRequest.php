<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AvatarRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'avatar' => [
                'required',
                'file',
                'mimes:jpg,jpeg,png,webp',
                'max:8192',
                'dimensions:min_width=50,min_height=50,max_width=8000,max_height=8000',
            ],
        ];
    }

    /**
     * Get custom validation messages for the avatar upload.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'avatar.max' => 'The avatar may not be larger than 8 MB before processing.',
            'avatar.dimensions' => 'The avatar must be at least 50x50 pixels and no larger than 8000x8000 pixels before processing.',
        ];
    }
}
