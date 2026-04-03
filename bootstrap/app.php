<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\ForceHttps::class,
            \App\Http\Middleware\SecurityHeaders::class,
        ]);

        $middleware->alias([
            'two-factor' => \App\Http\Middleware\EnsureTwoFactor::class,
            'two-factor-pending' => \App\Http\Middleware\EnsureTwoFactorPending::class,
            'account-active' => \App\Http\Middleware\EnsureAccountActive::class,
            'password-not-expired' => \App\Http\Middleware\EnsurePasswordNotExpired::class,
            'check-ip-policy' => \App\Http\Middleware\CheckIpPolicy::class,
            'log-action' => \App\Http\Middleware\LogRequest::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
