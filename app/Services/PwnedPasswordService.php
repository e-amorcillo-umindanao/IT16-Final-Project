<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PwnedPasswordService
{
    /**
     * Check if a password has appeared in a data breach.
     * Uses k-Anonymity model (only sends first 5 chars of SHA-1 hash).
     */
    public function isPwned(string $password): int
    {
        $hash   = strtoupper(sha1($password));
        $prefix = substr($hash, 0, 5);
        $suffix = substr($hash, 5);

        try {
            $response = Http::timeout(3)
                ->withHeaders(['Add-Padding' => 'true'])
                ->get("https://api.pwnedpasswords.com/range/{$prefix}");

            if ($response->failed()) {
                return 0; // Fail open
            }

            foreach (explode("\n", $response->body()) as $line) {
                // The API returns suffixes and counts separated by a colon
                $parts = explode(':', trim($line));
                if (count($parts) === 2) {
                    [$hashSuffix, $count] = $parts;
                    if (strtoupper($hashSuffix) === $suffix) {
                        $count = (int) $count;

                        // Log the rejection if pwned and user is authenticated
                        if ($count > 0 && auth()->check()) {
                            app(AuditService::class)->log('pwned_password_rejected', null, [
                                'breach_count' => $count,
                                'context'      => request()->routeIs('register') ? 'registration' : 'password_change',
                            ]);
                        }

                        return $count;
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning('HIBP API request failed', ['error' => $e->getMessage()]);
        }

        return 0;
    }
}
