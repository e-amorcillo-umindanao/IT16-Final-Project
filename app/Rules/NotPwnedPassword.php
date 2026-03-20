<?php

namespace App\Rules;

use App\Services\PwnedPasswordService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class NotPwnedPassword implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $count = app(PwnedPasswordService::class)->isPwned($value);

        if ($count > 0) {
            $fail("This password has appeared in {$count} known data breach(es) and cannot be used. Please choose a different password.");
        }
    }
}
