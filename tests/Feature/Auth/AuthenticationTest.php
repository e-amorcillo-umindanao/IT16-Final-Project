<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\RecaptchaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_login_route_is_rate_limited_after_too_many_requests_from_the_same_ip(): void
    {
        $user = User::factory()->create();

        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->post('/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ]);
        }

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(429);
        $this->assertGuest();
    }

    public function test_login_page_requires_recaptcha_after_repeated_failed_attempts(): void
    {
        $user = User::factory()->create();

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->from('/login')->post('/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ]);
        }

        $response = $this->get('/login');

        $response->assertInertia(fn ($page) => $page
            ->component('Auth/Login')
            ->where('requiresRecaptcha', true));
    }

    public function test_login_rejects_missing_recaptcha_after_repeated_failed_attempts(): void
    {
        $user = User::factory()->create();
        $this->enableRecaptcha();

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->from('/login')->post('/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ]);
        }

        $response = $this->from('/login')->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
            'recaptcha_token' => '',
        ]);

        $response->assertSessionHasErrors('recaptcha_token');
        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }

    private function enableRecaptcha(): void
    {
        config([
            'services.recaptcha.site_key' => 'site-key',
            'services.recaptcha.secret_key' => 'secret-key',
        ]);
    }
}
