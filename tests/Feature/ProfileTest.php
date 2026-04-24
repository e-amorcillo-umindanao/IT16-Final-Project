<?php

namespace Tests\Feature;

use App\Services\RecoveryCodeService;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Auth\Notifications\VerifyEmail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertOk();
    }

    public function test_profile_page_only_shares_minimal_auth_user_fields(): void
    {
        $user = User::factory()->create([
            'google_id' => 'google-123',
            'google_avatar' => 'https://example.com/google-avatar.png',
        ]);

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.id', $user->id)
            ->where('auth.user.name', $user->name)
            ->where('auth.user.email', $user->email)
            ->where('auth.user.avatar_url', 'https://example.com/google-avatar.png')
            ->where('auth.user.google_linked', true));

        $props = $response->viewData('page')['props']['auth']['user'];

        $this->assertArrayNotHasKey('google_avatar', $props);
        $this->assertArrayNotHasKey('google_id', $props);
    }

    public function test_profile_information_can_be_updated(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/profile', [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
        Notification::assertNothingSent();
    }

    public function test_two_factor_can_be_disabled_from_the_profile_page(): void
    {
        $user = User::factory()->create([
            'two_factor_enabled' => true,
            'two_factor_secret' => 'ABCDEFGHIJKLMNOP',
        ]);
        app(RecoveryCodeService::class)->generate($user);

        $response = $this
            ->actingAs($user)
            ->withSession(['2fa_verified' => true])
            ->delete('/two-factor');

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $user->refresh();

        $this->assertFalse($user->two_factor_enabled);
        $this->assertNull($user->two_factor_secret);
        $this->assertSame(0, $user->twoFactorRecoveryCodes()->count());
    }

    public function test_user_can_delete_their_account(): void
    {
        Mail::fake();

        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->post('/profile/delete-account', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('login'));

        $this->assertGuest();
        $this->assertFalse($user->fresh()->is_active);
        $this->assertNotNull($user->fresh()->deletion_requested_at);
    }

    public function test_correct_password_must_be_provided_to_delete_account(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->post('/profile/delete-account', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/profile');

        $this->assertNotNull($user->fresh());
    }

    public function test_deactivated_users_are_logged_out_on_their_next_authenticated_request(): void
    {
        $user = User::factory()->create([
            'is_active' => false,
        ]);

        $response = $this
            ->actingAs($user)
            ->get('/profile');

        $response
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }
}
