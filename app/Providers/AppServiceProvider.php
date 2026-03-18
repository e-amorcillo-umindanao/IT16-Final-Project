<?php

namespace App\Providers;

use App\Services\AuditService;
use App\Models\Document;
use App\Policies\DocumentPolicy;
use App\Services\EncryptionService;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

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

        // --- Rate Limiters ---

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
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

        RateLimiter::for('password-reset', function (Request $request) {
            return Limit::perMinute(3)->by($request->ip());
        });

        \Illuminate\Support\Facades\Gate::policy(Document::class, DocumentPolicy::class);

        // Ensure vault directory exists
        $vaultPath = config('securevault.vault_path', storage_path('app/vault'));
        if (!File::exists($vaultPath)) {
            File::makeDirectory($vaultPath, 0755, true);
        }
    }
}
