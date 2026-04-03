<?php

namespace App\Services;

use App\Models\IpRule;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class IpPolicyService
{
    private const PRIVATE_CIDRS = [
        '10.0.0.0/8',
        '172.16.0.0/12',
        '192.168.0.0/16',
        '127.0.0.0/8',
        '::1/128',
        'fc00::/7',
    ];

    public function isAllowed(string $ip): bool
    {
        if ($this->matchesAny($ip, self::PRIVATE_CIDRS)) {
            return true;
        }

        $rules = $this->getCachedRules();

        $allowlistRules = $rules->where('type', 'allowlist');

        if ($allowlistRules->isNotEmpty()) {
            return $this->matchesAny($ip, $allowlistRules->pluck('cidr')->all());
        }

        $blocklistRules = $rules->where('type', 'blocklist');

        if ($blocklistRules->isNotEmpty()) {
            return ! $this->matchesAny($ip, $blocklistRules->pluck('cidr')->all());
        }

        return true;
    }

    /**
     * @param  array<int, string>  $cidrs
     */
    public function matchesAny(string $ip, array $cidrs): bool
    {
        foreach ($cidrs as $cidr) {
            if ($this->ipMatchesCidr($ip, $cidr)) {
                return true;
            }
        }

        return false;
    }

    public function ipMatchesCidr(string $ip, string $cidr): bool
    {
        [$subnet, $prefixLen] = array_pad(explode('/', $cidr, 2), 2, null);
        $defaultPrefix = str_contains($subnet, ':') ? '128' : '32';
        $prefixLen = $prefixLen ?? $defaultPrefix;

        $ipBin = inet_pton($ip);
        $subnetBin = inet_pton($subnet);

        if ($ipBin === false || $subnetBin === false) {
            return false;
        }

        $byteLength = strlen($ipBin);

        if ($byteLength !== strlen($subnetBin)) {
            return false;
        }

        $prefix = (int) $prefixLen;
        $fullBytes = intdiv($prefix, 8);
        $remainingBits = $prefix % 8;

        if (substr($ipBin, 0, $fullBytes) !== substr($subnetBin, 0, $fullBytes)) {
            return false;
        }

        if ($remainingBits > 0 && $fullBytes < $byteLength) {
            $mask = 0xFF & (0xFF << (8 - $remainingBits));

            if ((ord($ipBin[$fullBytes]) & $mask) !== (ord($subnetBin[$fullBytes]) & $mask)) {
                return false;
            }
        }

        return true;
    }

    public function clearCache(): void
    {
        Cache::forget('ip_rules');
    }

    private function getCachedRules(): Collection
    {
        return Cache::remember('ip_rules', 300, fn () => IpRule::query()->get(['type', 'cidr']));
    }
}
