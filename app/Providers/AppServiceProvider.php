<?php

namespace App\Providers;

use App\Rules\NotPwnedPassword;
use App\Services\AuditService;
use App\Models\Document;
use App\Policies\DocumentPolicy;
use App\Services\EncryptionService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password as PasswordRule;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(EncryptionService::class, fn () => new EncryptionService());
        $this->app->singleton(AuditService::class, fn () => new AuditService());
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        if ($this->app->environment('production')) {
            if (config('app.debug')) {
                throw new RuntimeException('APP_DEBUG must be false in production. Check your .env file.');
            }

            if (blank(config('app.key')) || config('app.key') === 'base64:') {
                throw new RuntimeException('APP_KEY is not set. Run: php artisan key:generate');
            }

            if (config('mail.default') !== 'smtp' || config('mail.mailers.smtp.host') !== 'smtp.gmail.com') {
                Log::critical('SecureVault mail is not configured to use Gmail SMTP.', [
                    'mailer' => config('mail.default'),
                    'host' => config('mail.mailers.smtp.host'),
                ]);
            }

            if (blank(config('mail.mailers.smtp.username'))) {
                Log::critical('SecureVault mail is missing the SMTP username. Email verification may fail.');
            }
        }

        if (file_exists(public_path('.env'))) {
            Log::critical('SECURITY: .env file detected in public/ directory. Remove immediately.');
        }

        PasswordRule::defaults(static fn () => PasswordRule::min(8)
            ->mixedCase()
            ->numbers()
            ->symbols()
            ->rules([new NotPwnedPassword()]));

        // --- Rate Limiters ---

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('upload', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('general', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('search', function (Request $request) {
            return Limit::perMinute(30)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('vault-unlock', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        RateLimiter::for('password-store', function (Request $request) {
            return Limit::perMinute(5)->by(strtolower((string) $request->input('email')).'|'.$request->ip());
        });

        RateLimiter::for('profile-password-update', function (Request $request) {
            return Limit::perMinute(5)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('two-factor-manage', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('two-factor-recovery', function (Request $request) {
            return Limit::perMinute(5)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('email-verification', function (Request $request) {
            return Limit::perMinute(6)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('share-links', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('shares', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('account-deletion', function (Request $request) {
            return Limit::perMinute(3)->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('google_oauth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('google-oauth-callback', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        \Illuminate\Support\Facades\Gate::policy(Document::class, DocumentPolicy::class);

        // Ensure vault directory exists
        $vaultPath = config('securevault.vault_path', storage_path('app/vault'));
        if (!File::exists($vaultPath)) {
            File::makeDirectory($vaultPath, 0755, true);
        }

        $scanStagingPath = config('filesystems.disks.scan-staging.root', storage_path('app/scan-staging'));
        if (! File::exists($scanStagingPath)) {
            File::makeDirectory($scanStagingPath, 0700, true);
        }
    }
}
