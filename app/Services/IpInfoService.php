<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IpInfoService
{
    /**
     * Map IP address to location data using ipinfo.io.
     * Results are cached for 24 hours.
     */
    public function lookup(string $ip): array
    {
        // Skip lookup for local/private network IPs
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return [
                'city'     => 'Local',
                'region'   => 'DEV',
                'country'  => 'DEV',
                'location' => 'Local / DEV',
            ];
        }

        return Cache::remember("ipinfo:{$ip}", now()->addHours(24), function () use ($ip) {
            try {
                $token = config('services.ipinfo.token');
                $response = Http::timeout(3)
                    ->get("https://ipinfo.io/{$ip}/json?token={$token}");

                if ($response->failed()) {
                    return ['city' => null, 'region' => null, 'country' => null, 'location' => 'Unknown location'];
                }

                $data     = $response->json();
                $city     = $data['city']    ?? null;
                $country  = $data['country'] ?? null;

                return [
                    'city'     => $city,
                    'region'   => $data['region']   ?? null,
                    'country'  => $country,
                    'timezone' => $data['timezone'] ?? null,
                    'org'      => $data['org']      ?? null,
                    'location' => $city && $country ? "{$city}, {$country}" : null,
                ];
            } catch (\Exception $e) {
                Log::warning('IPInfo lookup failed', ['error' => $e->getMessage(), 'ip' => $ip]);
                return ['city' => null, 'region' => null, 'country' => null, 'location' => 'Unknown location'];
            }
        });
    }
}
