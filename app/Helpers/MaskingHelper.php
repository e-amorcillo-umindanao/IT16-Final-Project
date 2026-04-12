<?php

namespace App\Helpers;

class MaskingHelper
{
    public static function maskEmail(string $email): string
    {
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return '***';
        }

        [$local, $domain] = explode('@', $email, 2);
        $length = strlen($local);

        if ($length <= 2) {
            $masked = str_repeat('*', $length);
        } elseif ($length <= 4) {
            $masked = $local[0].str_repeat('*', $length - 1);
        } else {
            $masked = substr($local, 0, 2)
                .str_repeat('*', $length - 3)
                .$local[$length - 1];
        }

        return $masked.'@'.$domain;
    }

    public static function maskIp(string $ip): string
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $parts = explode('.', $ip);

            return $parts[0].'.'.$parts[1].'.xxx.xxx';
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $colonPosition = strrpos($ip, ':');

            return $colonPosition === false
                ? 'xxxx:xxxx:xxxx:xxxx'
                : substr($ip, 0, $colonPosition + 1).'xxxx';
        }

        return 'xxx.xxx.xxx.xxx';
    }

    public static function maskString(string $value, int $visibleStart = 1, int $visibleEnd = 1): string
    {
        $length = strlen($value);

        if ($length <= $visibleStart + $visibleEnd) {
            return str_repeat('*', $length);
        }

        return substr($value, 0, $visibleStart)
            .str_repeat('*', $length - $visibleStart - $visibleEnd)
            .substr($value, -$visibleEnd);
    }
}
