<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\PwnedPasswordService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_can_be_updated(): void
    {
        $this->fakePwnedPasswords();

        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put('/profile/password', [
                'current_password' => 'password',
                'password' => 'StrongPass1!',
                'password_confirmation' => 'StrongPass1!',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/profile');

        $this->assertTrue(Hash::check('StrongPass1!', $user->refresh()->password));
        $this->assertNotNull($user->password_changed_at);
    }

    public function test_correct_password_must_be_provided_to_update_password(): void
    {
        $this->fakePwnedPasswords();

        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put('/profile/password', [
                'current_password' => 'wrong-password',
                'password' => 'StrongPass1!',
                'password_confirmation' => 'StrongPass1!',
            ]);

        $response
            ->assertSessionHasErrors('current_password')
            ->assertRedirect('/profile');
    }

    public function test_password_confirmation_errors_are_attached_to_the_confirmation_field(): void
    {
        $this->fakePwnedPasswords();

        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/profile')
            ->put('/profile/password', [
                'current_password' => 'password',
                'password' => 'StrongPass1!',
                'password_confirmation' => 'Mismatch1!',
            ]);

        $response
            ->assertSessionHasErrors('password_confirmation')
            ->assertRedirect('/profile');
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
