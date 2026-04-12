<?php

namespace App\Providers;

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
        }

        if (file_exists(public_path('.env'))) {
            Log::critical('SECURITY: .env file detected in public/ directory. Remove immediately.');
        }

        // --- Rate Limiters ---

        RateLimiter::for('login', function (Request $request) {
            // Route-level burst protection by IP. Per-account failures are still
            // tracked separately inside LoginRequest using the email+IP throttle key.
            return Limit::perMinute(10)->by($request->ip());
        });

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

        RateLimiter::for('google_oauth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        \Illuminate\Support\Facades\Gate::policy(Document::class, DocumentPolicy::class);

        // Ensure vault directory exists
        $vaultPath = config('securevault.vault_path', storage_path('app/vault'));
        if (!File::exists($vaultPath)) {
            File::makeDirectory($vaultPath, 0755, true);
        }
    }
}
