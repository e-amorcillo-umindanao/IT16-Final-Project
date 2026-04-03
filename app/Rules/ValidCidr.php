<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidCidr implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! str_contains($value, '/')) {
            $fail('The :attribute must be a valid CIDR notation (e.g. 203.0.113.0/24).');

            return;
        }

        [$ip, $prefix] = explode('/', $value, 2);

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            if (! ctype_digit($prefix) || (int) $prefix < 0 || (int) $prefix > 32) {
                $fail('IPv4 CIDR prefix must be between 0 and 32.');
            }

            return;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            if (! ctype_digit($prefix) || (int) $prefix < 0 || (int) $prefix > 128) {
                $fail('IPv6 CIDR prefix must be between 0 and 128.');
            }

            return;
        }

        $fail('The :attribute must contain a valid IPv4 or IPv6 address.');
    }
}
