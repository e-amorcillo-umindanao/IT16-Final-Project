<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\RecaptchaService;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private const GENERIC_RESET_STATUS = 'If that email address is in our system, we have sent a password reset link.';

    public function test_reset_password_link_screen_can_be_rendered(): void
    {
        $response = $this->get('/forgot-password');

        $response->assertStatus(200);
    }

    public function test_reset_password_link_can_be_requested(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $response = $this->post('/forgot-password', ['email' => $user->email]);

        $response->assertSessionHas('status', self::GENERIC_RESET_STATUS);
        Notification::assertSentTo($user, ResetPassword::class);
    }

    public function test_reset_password_returns_the_same_message_for_unknown_emails(): void
    {
        Notification::fake();

        $response = $this->post('/forgot-password', ['email' => 'missing@example.com']);

        $response->assertSessionHas('status', self::GENERIC_RESET_STATUS);
        Notification::assertNothingSent();
    }

    public function test_reset_password_screen_can_be_rendered(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) {
            $response = $this->get('/reset-password/'.$notification->token);

            $response->assertStatus(200);

            return true;
        });
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->post('/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $response = $this->post('/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

            $response
                ->assertSessionHasNoErrors()
                ->assertRedirect(route('login'));

            $user->refresh();
            $this->assertTrue(Hash::check('password', $user->password));
            $this->assertNotNull($user->password_changed_at);

            return true;
        });
    }

    public function test_password_reset_rejects_failed_recaptcha_when_enabled(): void
    {
        Notification::fake();
        $this->fakeRecaptcha(false);

        $response = $this->post('/forgot-password', [
            'email' => 'blocked@example.com',
            'recaptcha_token' => 'recaptcha-token',
        ]);

        $response->assertSessionHasErrors('recaptcha_token');
        Notification::assertNothingSent();
    }

    public function test_password_reset_proceeds_when_recaptcha_is_unavailable_on_the_client(): void
    {
        Log::spy();
        Notification::fake();
        $this->enableRecaptcha();

        $user = User::factory()->create();

        $response = $this->post('/forgot-password', [
            'email' => $user->email,
            'recaptcha_token' => RecaptchaService::UNAVAILABLE_SENTINEL,
        ]);

        $response->assertSessionHas('status', self::GENERIC_RESET_STATUS);
        Notification::assertSentTo($user, ResetPassword::class);

        Log::shouldHaveReceived('warning')
            ->once()
            ->withArgs(function (string $message, array $context): bool {
                return $message === 'reCAPTCHA token unavailable. Failing open.'
                    && $context['action'] === 'unknown'
                    && $context['reason'] === 'client_unavailable_sentinel';
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
