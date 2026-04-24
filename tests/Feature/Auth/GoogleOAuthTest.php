<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Tests\TestCase;

class GoogleOAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.google.client_id' => null,
            'services.google.client_secret' => null,
            'services.google.redirect' => null,
        ]);
    }

    public function test_login_page_hides_google_sign_in_when_oauth_is_not_configured(): void
    {
        $response = $this->get('/login');

        $response->assertInertia(fn ($page) => $page
            ->component('Auth/Login')
            ->where('googleOAuthEnabled', false));
    }

    public function test_login_page_shows_google_sign_in_when_oauth_is_configured(): void
    {
        $this->enableGoogleOAuth();

        $response = $this->get('/login');

        $response->assertInertia(fn ($page) => $page
            ->component('Auth/Login')
            ->where('googleOAuthEnabled', true));
    }

    public function test_unknown_google_account_is_redirected_to_registration_with_prefilled_email(): void
    {
        $this->enableGoogleOAuth();
        $this->mockGoogleCallbackUser(
            $this->fakeGoogleUser(
                id: 'google-unknown',
                email: 'new.user@gmail.com',
            ),
        );

        $response = $this
            ->withSession(['oauth_intent' => 'login'])
            ->get(route('auth.google.callback'));

        $response
            ->assertRedirect(route('register'))
            ->assertSessionHas('google_email', 'new.user@gmail.com')
            ->assertSessionHasErrors('google');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'google_oauth_login_failed',
        ]);
    }

    public function test_unlinked_google_account_is_rejected_during_sign_in(): void
    {
        $this->enableGoogleOAuth();

        $user = User::factory()->create([
            'email' => 'linked.user@gmail.com',
        ]);

        $this->mockGoogleCallbackUser(
            $this->fakeGoogleUser(
                id: 'google-123',
                email: $user->email,
            ),
        );

        $response = $this
            ->withSession(['oauth_intent' => 'login'])
            ->get(route('auth.google.callback'));

        $response
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('google');

        $this->assertGuest();
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'google_oauth_login_failed',
        ]);
    }

    public function test_linked_google_account_can_sign_in_and_updates_the_cached_avatar(): void
    {
        $this->enableGoogleOAuth();

        $user = User::factory()->create([
            'email' => 'oauth.user@gmail.com',
            'google_id' => 'google-123',
            'google_avatar' => 'https://example.com/old-avatar.png',
        ]);

        $this->mockGoogleCallbackUser(
            $this->fakeGoogleUser(
                id: 'google-123',
                email: $user->email,
                avatar: 'https://example.com/new-avatar.png',
            ),
        );

        $response = $this
            ->withSession(['oauth_intent' => 'login'])
            ->get(route('auth.google.callback'));

        $response->assertRedirect(route('dashboard', absolute: false));
        $this->assertAuthenticatedAs($user);
        $this->assertSame('https://example.com/new-avatar.png', $user->fresh()->google_avatar);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'google_oauth_login',
        ]);
    }

    public function test_google_sign_in_still_hits_the_two_factor_guard_after_authentication(): void
    {
        $this->enableGoogleOAuth();

        $user = User::factory()->create([
            'email' => 'totp.user@gmail.com',
            'google_id' => 'google-2fa',
            'two_factor_enabled' => true,
            'two_factor_secret' => 'ABCDEFGHIJKLMNOP',
        ]);

        $this->mockGoogleCallbackUser(
            $this->fakeGoogleUser(
                id: 'google-2fa',
                email: $user->email,
            ),
        );

        $this
            ->withSession(['oauth_intent' => 'login'])
            ->get(route('auth.google.callback'))
            ->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($user);
        $this->get('/dashboard')->assertRedirect(route('two-factor.challenge'));
    }

    public function test_matching_google_account_can_be_linked_from_the_profile_page(): void
    {
        $this->enableGoogleOAuth();

        $user = User::factory()->create([
            'email' => 'profile.user@gmail.com',
            'google_id' => null,
            'google_avatar' => null,
        ]);

        $this->mockGoogleCallbackUser(
            $this->fakeGoogleUser(
                id: 'google-link',
                email: $user->email,
                avatar: 'https://example.com/profile-avatar.png',
            ),
        );

        $response = $this
            ->actingAs($user)
            ->withSession(['oauth_intent' => 'link'])
            ->get(route('auth.google.callback'));

        $response->assertRedirect(route('profile.edit'));
        $this->assertSame('google-link', $user->fresh()->google_id);
        $this->assertSame('https://example.com/profile-avatar.png', $user->fresh()->google_avatar);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'google_oauth_linked',
        ]);
    }

    public function test_google_account_can_be_unlinked_with_the_current_password(): void
    {
        $user = User::factory()->create([
            'email' => 'unlink.user@gmail.com',
            'google_id' => 'google-unlink',
            'google_avatar' => 'https://example.com/unlink-avatar.png',
        ]);

        $response = $this
            ->actingAs($user)
            ->delete(route('profile.google.unlink'), [
                'password' => 'password',
            ]);

        $response->assertRedirect(route('profile.edit'));
        $this->assertNull($user->fresh()->google_id);
        $this->assertNull($user->fresh()->google_avatar);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'action' => 'google_oauth_unlinked',
        ]);
    }

    private function enableGoogleOAuth(): void
    {
        config([
            'services.google.client_id' => 'google-client-id',
            'services.google.client_secret' => 'google-client-secret',
            'services.google.redirect' => 'http://localhost:8000/auth/google/callback',
        ]);
    }

    private function fakeGoogleUser(
        string $id,
        string $email,
        string $avatar = 'https://example.com/google-avatar.png',
        bool $verified = true,
    ): object {
        return new class($id, $email, $avatar, $verified)
        {
            public array $user;

            public function __construct(
                private readonly string $id,
                private readonly string $email,
                private readonly string $avatar,
                bool $verified,
            ) {
                $this->user = [
                    'verified_email' => $verified,
                ];
            }

            public function getId(): string
            {
                return $this->id;
            }

            public function getEmail(): string
            {
                return $this->email;
            }

            public function getAvatar(): string
            {
                return $this->avatar;
            }
        };
    }

    private function mockGoogleCallbackUser(object $user): void
    {
        Socialite::shouldReceive('driver->user')
            ->once()
            ->withNoArgs()
            ->andReturn($user);
    }
}
