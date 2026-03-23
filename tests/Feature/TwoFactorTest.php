<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    public function test_two_factor_secret_can_be_mass_assigned(): void
    {
        $user = User::factory()->create();
        $secret = 'ABCDEFGHIJKLMNOP';

        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_enabled' => true,
        ]);

        $user->refresh();

        $this->assertSame($secret, $user->two_factor_secret);
        $this->assertTrue($user->two_factor_enabled);
        $this->assertTrue($user->hasTwoFactorSecretValid());
    }

    public function test_enable_redirects_back_to_setup_when_session_secret_is_missing_or_invalid(): void
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from(route('two-factor.setup'))
            ->post(route('two-factor.enable'), [
                'code' => '123456',
            ]);

        $response
            ->assertRedirect(route('two-factor.setup'))
            ->assertSessionHasErrors('code');

        $user->refresh();

        $this->assertFalse($user->two_factor_enabled);
        $this->assertNull($user->two_factor_secret);
    }

    public function test_verify_resets_corrupt_two_factor_state_instead_of_throwing(): void
    {
        $user = User::factory()->create([
            'two_factor_enabled' => true,
            'two_factor_secret' => null,
        ]);

        $response = $this
            ->actingAs($user)
            ->withSession(['2fa_verified' => true])
            ->post(route('two-factor.verify'), [
                'code' => '123456',
            ]);

        $response
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('code');

        $this->assertGuest();
        $this->assertFalse($user->fresh()->two_factor_enabled);
        $this->assertNull($user->fresh()->two_factor_secret);
    }

    public function test_challenge_resets_corrupt_two_factor_state_instead_of_rendering_form(): void
    {
        $user = User::factory()->create([
            'two_factor_enabled' => true,
            'two_factor_secret' => '',
        ]);

        $response = $this
            ->actingAs($user)
            ->get(route('two-factor.challenge'));

        $response
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');

        $this->assertGuest();
        $this->assertFalse($user->fresh()->two_factor_enabled);
        $this->assertNull($user->fresh()->two_factor_secret);
    }
}
