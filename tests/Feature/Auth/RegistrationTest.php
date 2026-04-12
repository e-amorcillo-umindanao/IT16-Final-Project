<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\PwnedPasswordService;
use App\Services\RecaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    private const GENERIC_REGISTRATION_STATUS = 'If your email can be registered, we have sent the next steps to your inbox.';

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        Notification::fake();
        $this->fakePwnedPasswords();

        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@gmail.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
        ]);

        $user = User::where('email', 'test@gmail.com')->firstOrFail();

        $this->assertAuthenticatedAs($user);
        $this->assertDatabaseHas('users', [
            'email' => 'test@gmail.com',
        ]);
        $this->assertNull($user->email_verified_at);
        $this->assertNotNull($user->password_changed_at);
        Notification::assertSentTo($user, VerifyEmail::class);
        $response
            ->assertRedirect(route('verification.notice', absolute: false));
    }

    public function test_newly_registered_users_are_redirected_to_verification_and_cannot_access_dashboard_until_verified(): void
    {
        Notification::fake();
        $this->fakePwnedPasswords();

        $this->post('/register', [
            'name' => 'Dashboard User',
            'email' => 'dashboard@gmail.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
        ]);

        $user = User::where('email', 'dashboard@gmail.com')->firstOrFail();
        $this->assertAuthenticatedAs($user);
        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);

        $this
            ->get(route('dashboard'))
            ->assertRedirect(route('verification.notice', absolute: false));
    }

    public function test_existing_emails_are_rejected_by_the_unique_email_rule(): void
    {
        $this->fakePwnedPasswords();

        User::factory()->create([
            'email' => 'test@gmail.com',
        ]);

        $response = $this->from('/register')->post('/register', [
            'name' => 'Existing User',
            'email' => 'test@gmail.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
        ]);

        $response->assertRedirect('/register');
        $response->assertSessionHasErrors('email');
        $this->assertDatabaseCount('users', 1);
    }

    public function test_registration_proceeds_when_recaptcha_is_unavailable_on_the_client(): void
    {
        Log::spy();
        Notification::fake();
        $this->fakePwnedPasswords();
        $this->enableRecaptcha();

        $response = $this->post('/register', [
            'name' => 'Fail Open User',
            'email' => 'failopen@gmail.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
            'recaptcha_token' => RecaptchaService::UNAVAILABLE_SENTINEL,
        ]);

        $user = User::where('email', 'failopen@gmail.com')->firstOrFail();

        $this->assertDatabaseHas('users', [
            'email' => 'failopen@gmail.com',
        ]);
        $this->assertAuthenticatedAs($user);
        Notification::assertSentTo($user, VerifyEmail::class);
        $response
            ->assertRedirect(route('verification.notice', absolute: false));

        Log::shouldHaveReceived('warning')
            ->once()
            ->withArgs(function (string $message, array $context): bool {
                return $message === 'reCAPTCHA token unavailable. Failing open.'
                    && $context['action'] === 'unknown'
                    && $context['reason'] === 'client_unavailable_sentinel';
            });
    }

    public function test_registration_rejects_failed_recaptcha_when_enabled(): void
    {
        $this->fakePwnedPasswords();
        $this->fakeRecaptcha(false);

        $response = $this->post('/register', [
            'name' => 'Blocked User',
            'email' => 'blocked@gmail.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
            'recaptcha_token' => 'recaptcha-token',
        ]);

        $this->assertDatabaseMissing('users', [
            'email' => 'blocked@gmail.com',
        ]);
        $response->assertSessionHasErrors('recaptcha_token');
    }

    public function test_registration_rejects_non_gmail_addresses_with_a_custom_message(): void
    {
        $this->fakePwnedPasswords();

        $response = $this->from('/register')->post('/register', [
            'name' => 'Non Gmail User',
            'email' => 'test@example.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
        ]);

        $response
            ->assertRedirect('/register')
            ->assertSessionHasErrors([
                'email' => 'Registration is currently limited to Gmail addresses (@gmail.com).',
            ]);

        $this->assertDatabaseMissing('users', [
            'email' => 'test@example.com',
        ]);
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

    private function fakeRecaptcha(bool $isValid): void
    {
        $this->enableRecaptcha();

        $this->app->bind(RecaptchaService::class, fn () => new class($isValid) extends RecaptchaService
        {
            public function __construct(private readonly bool $isValid)
            {
            }

            public function verify(?string $token, string $action = ''): bool
            {
                return $this->isValid;
            }
        });
    }

    private function enableRecaptcha(): void
    {
        config([
            'services.recaptcha.site_key' => 'site-key',
            'services.recaptcha.secret_key' => 'secret-key',
        ]);
    }
}
