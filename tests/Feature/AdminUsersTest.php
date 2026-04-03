<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AdminUsersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_super_admin_can_view_users_page_with_security_status_props(): void
    {
        $superAdmin = User::factory()->create([
            'name' => 'Zulu Super Admin',
        ]);
        $superAdmin->assignRole('super-admin');

        $user = User::factory()->unverified()->create([
            'name' => 'Alpha User',
            'two_factor_enabled' => true,
            'last_login_at' => now()->subHour(),
        ]);

        $this->actingAs($superAdmin)
            ->get(route('admin.users'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users/Index')
                ->where('sort', 'name')
                ->where('direction', 'asc')
                ->where('users.data.0.name', 'Alpha User')
                ->where('users.data.0.two_factor_enabled', true)
                ->where('users.data.0.email_verified_at', null)
                ->where('users.data.0.is_active', true));
    }

    public function test_users_page_can_sort_by_last_active_descending(): void
    {
        $superAdmin = User::factory()->create([
            'name' => 'Zulu Super Admin',
        ]);
        $superAdmin->assignRole('super-admin');

        $olderUser = User::factory()->create([
            'name' => 'Older User',
            'last_login_at' => now()->subDays(2),
        ]);

        $recentUser = User::factory()->create([
            'name' => 'Recent User',
            'last_login_at' => now()->subMinutes(5),
        ]);

        $this->actingAs($superAdmin)
            ->get(route('admin.users', [
                'sort' => 'last_login_at',
                'direction' => 'desc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users/Index')
                ->where('sort', 'last_login_at')
                ->where('direction', 'desc')
                ->where('users.data.0.id', $recentUser->id)
                ->where('users.data.1.id', $olderUser->id));
    }
}
