<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        @php($cspNonce = \Illuminate\Support\Facades\Vite::cspNonce())
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title inertia>{{ config('app.name', 'SecureVault') }}</title>
        <link rel="icon" type="image/png" href="/images/logo.png">
        <script @if ($cspNonce) nonce="{{ $cspNonce }}" @endif>
            (function () {
                const stored = localStorage.getItem('securevault_theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const shouldUseDark = stored === 'dark' || ((stored === null || stored === 'system') && prefersDark);

                document.documentElement.classList.toggle('dark', shouldUseDark);
                document.documentElement.style.colorScheme = shouldUseDark ? 'dark' : 'light';
            })();
        </script>
        <!-- Scripts -->
        @routes(null, $cspNonce)
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
