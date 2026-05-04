<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\PwnedPasswordService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Socialite\Facades\Socialite;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_search_is_limited_to_thirty_requests_per_minute(): void
    {
        $user = User::factory()->create();

        for ($attempt = 1; $attempt <= 30; $attempt++) {
            $this->actingAs($user)
                ->getJson('/search?q=report')
                ->assertOk();
        }

        $this->actingAs($user)
            ->getJson('/search?q=report')
            ->assertTooManyRequests();
    }

    public function test_general_limiter_is_applied_to_miscellaneous_authenticated_routes(): void
    {
        $middleware = Route::getRoutes()
            ->getByName('profile.edit')
            ?->gatherMiddleware();

        $this->assertIsArray($middleware);
        $this->assertContains('throttle:general', $middleware);
    }

    public function test_login_route_uses_a_five_per_minute_throttle(): void
    {
        $route = collect(Route::getRoutes()->getRoutes())
            ->first(fn ($route) => $route->uri() === 'login' && in_array('POST', $route->methods(), true));

        $this->assertNotNull($route);

        $middleware = $route->gatherMiddleware();

        $this->assertIsArray($middleware);
        $this->assertContains('throttle:5,1', $middleware);
    }

    public function test_password_reset_form_route_has_a_light_get_throttle(): void
    {
        $middleware = Route::getRoutes()
            ->getByName('password.reset')
            ?->gatherMiddleware();

        $this->assertIsArray($middleware);
        $this->assertContains('throttle:10,1', $middleware);
    }

    public function test_two_factor_recovery_form_route_has_a_light_get_throttle(): void
    {
        $middleware = Route::getRoutes()
            ->getByName('two-factor.recovery')
            ?->gatherMiddleware();

        $this->assertIsArray($middleware);
        $this->assertContains('throttle:10,1', $middleware);
    }

    public function test_sensitive_routes_have_dedicated_rate_limiters(): void
    {
        $shareLinkMiddleware = Route::getRoutes()
            ->getByName('documents.share-link')
            ?->gatherMiddleware();
        $shareStoreMiddleware = Route::getRoutes()
            ->getByName('shares.store')
            ?->gatherMiddleware();
        $deleteAccountMiddleware = Route::getRoutes()
            ->getByName('profile.delete-account')
            ?->gatherMiddleware();
        $passwordStoreMiddleware = Route::getRoutes()
            ->getByName('password.store')
            ?->gatherMiddleware();
        $passwordUpdateMiddleware = Route::getRoutes()
            ->getByName('password.update')
            ?->gatherMiddleware();
        $profilePasswordUpdateMiddleware = Route::getRoutes()
            ->getByName('profile.password.update')
            ?->gatherMiddleware();
        $passwordExpiredUpdateMiddleware = Route::getRoutes()
            ->getByName('password.expired.update')
            ?->gatherMiddleware();
        $twoFactorVerifyMiddleware = Route::getRoutes()
            ->getByName('two-factor.verify')
            ?->gatherMiddleware();
        $twoFactorEnableMiddleware = Route::getRoutes()
            ->getByName('two-factor.enable')
            ?->gatherMiddleware();
        $twoFactorDisableMiddleware = Route::getRoutes()
            ->getByName('two-factor.disable')
            ?->gatherMiddleware();
        $twoFactorDestroyMiddleware = Route::getRoutes()
            ->getByName('two-factor.destroy')
            ?->gatherMiddleware();
        $twoFactorRegenerateMiddleware = Route::getRoutes()
            ->getByName('two-factor.recovery-codes.regenerate')
            ?->gatherMiddleware();
        $googleCallbackMiddleware = Route::getRoutes()
            ->getByName('auth.google.callback')
            ?->gatherMiddleware();

        $this->assertIsArray($shareLinkMiddleware);
        $this->assertIsArray($shareStoreMiddleware);
        $this->assertIsArray($deleteAccountMiddleware);
        $this->assertIsArray($passwordStoreMiddleware);
        $this->assertIsArray($passwordUpdateMiddleware);
        $this->assertIsArray($profilePasswordUpdateMiddleware);
        $this->assertIsArray($passwordExpiredUpdateMiddleware);
        $this->assertIsArray($twoFactorVerifyMiddleware);
        $this->assertIsArray($twoFactorEnableMiddleware);
        $this->assertIsArray($twoFactorDisableMiddleware);
        $this->assertIsArray($twoFactorDestroyMiddleware);
        $this->assertIsArray($twoFactorRegenerateMiddleware);
        $this->assertIsArray($googleCallbackMiddleware);

        $this->assertContains('throttle:share-links', $shareLinkMiddleware);
        $this->assertContains('throttle:shares', $shareStoreMiddleware);
        $this->assertContains('throttle:account-deletion', $deleteAccountMiddleware);
        $this->assertContains('throttle:password-store', $passwordStoreMiddleware);
        $this->assertContains('throttle:profile-password-update', $passwordUpdateMiddleware);
        $this->assertContains('throttle:profile-password-update', $profilePasswordUpdateMiddleware);
        $this->assertContains('throttle:profile-password-update', $passwordExpiredUpdateMiddleware);
        $this->assertContains('throttle:two-factor', $twoFactorVerifyMiddleware);
        $this->assertContains('throttle:two-factor-manage', $twoFactorEnableMiddleware);
        $this->assertContains('throttle:two-factor-manage', $twoFactorDisableMiddleware);
        $this->assertContains('throttle:two-factor-manage', $twoFactorDestroyMiddleware);
        $this->assertContains('throttle:two-factor-manage', $twoFactorRegenerateMiddleware);
        $this->assertContains('throttle:google-oauth-callback', $googleCallbackMiddleware);
    }

    public function test_password_reset_submission_is_rate_limited(): void
    {
        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->post(route('password.store'), [
                'token' => 'invalid-token',
                'email' => 'user@gmail.com',
                'password' => 'StrongPass1!',
                'password_confirmation' => 'StrongPass1!',
            ]);
        }

        $this->post(route('password.store'), [
            'token' => 'invalid-token',
            'email' => 'user@gmail.com',
            'password' => 'StrongPass1!',
            'password_confirmation' => 'StrongPass1!',
        ])->assertTooManyRequests();
    }

    public function test_profile_password_update_is_rate_limited(): void
    {
        $this->fakePwnedPasswords();

        $user = User::factory()->create([
            'email_verified_at' => now(),
            'password_changed_at' => now(),
            'two_factor_deadline' => now()->addDays(3),
        ]);

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $this->actingAs($user)
                ->from('/profile')
                ->put(route('profile.password.update'), [
                    'current_password' => 'wrong-password',
                    'password' => 'StrongPass1!',
                    'password_confirmation' => 'StrongPass1!',
                ]);
        }

        $this->actingAs($user)
            ->from('/profile')
            ->put(route('profile.password.update'), [
                'current_password' => 'wrong-password',
                'password' => 'StrongPass1!',
                'password_confirmation' => 'StrongPass1!',
            ])->assertTooManyRequests();
    }

    public function test_google_oauth_callback_is_rate_limited(): void
    {
        Socialite::shouldReceive('driver->user')
            ->times(10)
            ->andThrow(new \RuntimeException('Invalid OAuth callback'));

        for ($attempt = 1; $attempt <= 10; $attempt++) {
            $this->withSession(['oauth_intent' => 'login'])
                ->get(route('auth.google.callback'))
                ->assertRedirect(route('login'));
        }

        $this->withSession(['oauth_intent' => 'login'])
            ->get(route('auth.google.callback'))
            ->assertTooManyRequests();
    }

    private function fakePwnedPasswords(): void
    {
        $this->app->bind(PwnedPasswordService::class, fn () => new class extends PwnedPasswordService
        {
            public function isPwned(string $password): int
            {
                return 0;
            }
        });
    }
}
