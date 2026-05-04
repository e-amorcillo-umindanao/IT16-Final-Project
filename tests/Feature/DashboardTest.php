<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_receives_current_two_factor_status_from_shared_auth_user_props(): void
    {
        $user = User::factory()->create([
            'two_factor_enabled' => true,
            'two_factor_secret' => 'ABCDEFGHIJKLMNOP',
            'two_factor_deadline' => null,
            'last_login_at' => now()->subMinute(),
            'last_login_ip' => '127.0.0.1',
        ]);

        $this->actingAs($user)
            ->withSession(['2fa_verified' => true])
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Dashboard')
                ->where('auth.user.two_factor_enabled', true)
                ->where('auth.user.two_factor_deadline', null)
                ->where('auth.user.last_login_ip', '127.0.0.1')
                ->has('auth.user.last_login_at'));
    }
}
