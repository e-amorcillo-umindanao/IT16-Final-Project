<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = null;
        $recaptchaEnabled = filled(config('services.recaptcha.site_key'));

        if (!app()->environment('local')) {
            $nonce = Vite::useCspNonce();
        }

        $response = $next($request);

        if (!app()->environment('local')) {
            $scriptSources = ["'self'", "'nonce-{$nonce}'"];
            $styleSources = ["'self'"];
            $imgSources = ["'self'", 'data:', 'blob:', 'https://www.gravatar.com', 'https://secure.gravatar.com'];
            $fontSources = ["'self'", 'data:'];
            $connectSources = ["'self'"];
            $frameSources = ["'self'"];

            if ($recaptchaEnabled) {
                $scriptSources = array_merge($scriptSources, [
                    'https://www.google.com',
                    'https://www.gstatic.com',
                    'https://www.recaptcha.net',
                ]);
                $imgSources = array_merge($imgSources, [
                    'https://www.google.com',
                    'https://www.gstatic.com',
                    'https://www.recaptcha.net',
                ]);
                $connectSources = array_merge($connectSources, [
                    'https://www.google.com',
                    'https://www.gstatic.com',
                    'https://www.recaptcha.net',
                ]);
                $frameSources = array_merge($frameSources, [
                    'https://www.google.com',
                    'https://www.recaptcha.net',
                ]);
            }

            $csp = implode('; ', [
                "default-src 'self'",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'none'",
                "object-src 'none'",
                'script-src '.implode(' ', array_unique($scriptSources)),
                "script-src-attr 'none'",
                'style-src '.implode(' ', array_unique($styleSources)),
                "style-src-attr 'none'",
                'img-src '.implode(' ', array_unique($imgSources)),
                'font-src '.implode(' ', array_unique($fontSources)),
                'connect-src '.implode(' ', array_unique($connectSources)),
                'frame-src '.implode(' ', array_unique($frameSources)),
            ]);
            $response->headers->set('Content-Security-Policy', $csp);
        }

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        return $response;
    }
}
