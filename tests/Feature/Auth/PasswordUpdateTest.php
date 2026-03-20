<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_can_be_updated(): void
    {
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
    }

    public function test_correct_password_must_be_provided_to_update_password(): void
    {
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
}
