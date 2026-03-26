<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\PwnedPasswordService;
use App\Services\RecaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
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
        $this->fakePwnedPasswords();

        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
        ]);

        $this->assertGuest();
        $this->assertDatabaseHas('users', [
            'email' => 'test@example.com',
        ]);
        $this->assertNotNull(User::where('email', 'test@example.com')->value('email_verified_at'));
        $response
            ->assertRedirect(route('login', absolute: false))
            ->assertSessionHas('status', self::GENERIC_REGISTRATION_STATUS);
    }

    public function test_newly_registered_users_can_access_the_dashboard_once_authenticated(): void
    {
        $this->fakePwnedPasswords();

        $this->post('/register', [
            'name' => 'Dashboard User',
            'email' => 'dashboard@example.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
        ]);

        $user = User::where('email', 'dashboard@example.com')->firstOrFail();

        $this->assertNotNull($user->email_verified_at);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk();
    }

    public function test_existing_emails_receive_the_same_registration_response(): void
    {
        $this->fakePwnedPasswords();

        User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $response = $this->post('/register', [
            'name' => 'Existing User',
            'email' => 'test@example.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
        ]);

        $this->assertGuest();
        $this->assertDatabaseCount('users', 1);
        $response
            ->assertRedirect(route('login', absolute: false))
            ->assertSessionHas('status', self::GENERIC_REGISTRATION_STATUS)
            ->assertSessionHasNoErrors();
    }

    public function test_registration_proceeds_when_recaptcha_is_unavailable_on_the_client(): void
    {
        Log::spy();
        $this->fakePwnedPasswords();
        $this->enableRecaptcha();

        $response = $this->post('/register', [
            'name' => 'Fail Open User',
            'email' => 'failopen@example.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
            'recaptcha_token' => RecaptchaService::UNAVAILABLE_SENTINEL,
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'failopen@example.com',
        ]);
        $response
            ->assertRedirect(route('login', absolute: false))
            ->assertSessionHas('status', self::GENERIC_REGISTRATION_STATUS);

        Log::shouldHaveReceived('warning')
            ->once()
            ->withArgs(function (string $message, array $context): bool {
                return $message === 'reCAPTCHA token unavailable. Failing open.'
                    && $context['action'] === 'register'
                    && $context['reason'] === 'client_unavailable_sentinel';
            });
    }

    public function test_registration_rejects_low_confidence_recaptcha_when_enabled(): void
    {
        $this->fakePwnedPasswords();
        $this->fakeRecaptcha(false);

        $response = $this->post('/register', [
            'name' => 'Blocked User',
            'email' => 'blocked@example.com',
            'password' => 'UniqueTestPass9@',
            'password_confirmation' => 'UniqueTestPass9@',
            'recaptcha_token' => 'recaptcha-token',
        ]);

        $this->assertDatabaseMissing('users', [
            'email' => 'blocked@example.com',
        ]);
        $response->assertSessionHasErrors('recaptcha_token');
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

            public function verify(?string $token, string $action): bool
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
            'services.recaptcha.threshold' => 0.5,
        ]);
    }
}
