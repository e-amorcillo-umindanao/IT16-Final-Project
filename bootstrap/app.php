<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

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
            'two-factor-enrolled' => \App\Http\Middleware\EnsureTwoFactorEnrolled::class,
            'account-active' => \App\Http\Middleware\EnsureAccountActive::class,
            'password-not-expired' => \App\Http\Middleware\EnsurePasswordNotExpired::class,
            'check-ip-policy' => \App\Http\Middleware\CheckIpPolicy::class,
            'log-action' => \App\Http\Middleware\LogRequest::class,
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (DecryptException $exception, Request $request) {
            Log::error('Decryption failure.', [
                'exception' => get_class($exception),
                'url' => $request->fullUrl(),
                'user_id' => $request->user()?->id,
                'ip' => $request->ip(),
            ]);

            if ($request->expectsJson() || $request->header('X-Inertia')) {
                return response()->json([
                    'message' => 'The file could not be opened. It may be corrupted.',
                ], 422);
            }

            return back()->withErrors([
                'file' => 'The file could not be opened. It may be corrupted.',
            ]);
        });

        $exceptions->render(function (\Throwable $exception, Request $request) {
            Log::error('Unhandled exception: '.$exception->getMessage(), [
                'exception' => get_class($exception),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'url' => $request->fullUrl(),
                'user_id' => $request->user()?->id,
                'ip' => $request->ip(),
            ]);

            $status = $exception instanceof HttpExceptionInterface
                ? $exception->getStatusCode()
                : 500;

            if ($status < 500) {
                return null;
            }

            if (app()->environment('production') || ! config('app.debug')) {
                $genericMessage = 'An unexpected error occurred. Please try again later.';

                if ($request->expectsJson() || $request->header('X-Inertia')) {
                    return response()->json([
                        'message' => $genericMessage,
                    ], $status);
                }

                return response()->view('errors.500', [
                    'message' => $genericMessage,
                ], $status);
            }

            return null;
        });
    })->create();
