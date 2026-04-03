<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use App\Services\PwnedPasswordService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class PasswordExpiryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RolePermissionSeeder::class);
        $this->fakePwnedPasswords();
        config(['securevault.password_expiry_days' => 90]);
    }

    public function test_expired_users_are_redirected_to_the_expired_password_page(): void
    {
        $user = User::factory()->create([
            'password_changed_at' => now()->subDays(91),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('password.expired'));
    }

    public function test_expired_password_page_is_accessible_when_password_is_expired(): void
    {
        $user = User::factory()->create([
            'password_changed_at' => now()->subDays(91),
        ]);

        $this->actingAs($user)
            ->get(route('password.expired'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/PasswordExpired')
                ->where('expiryDays', 90));
    }

    public function test_non_expired_users_can_access_the_dashboard(): void
    {
        $user = User::factory()->create([
            'password_changed_at' => now()->subDays(89),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk();
    }

    public function test_password_expiry_can_be_disabled(): void
    {
        config(['securevault.password_expiry_days' => 0]);

        $user = User::factory()->create([
            'password_changed_at' => now()->subYears(2),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk();
    }

    public function test_expired_password_update_sets_a_new_password_and_resets_the_expiry_timer(): void
    {
        $user = User::factory()->create([
            'password_changed_at' => now()->subDays(91),
        ]);

        $this->actingAs($user)
            ->patch(route('password.expired.update'), [
                'current_password' => 'password',
                'password' => 'StrongPass1!',
                'password_confirmation' => 'StrongPass1!',
            ])
            ->assertRedirect(route('dashboard'));

        $user->refresh();

        $this->assertTrue(Hash::check('StrongPass1!', $user->password));
        $this->assertNotNull($user->password_changed_at);
        $this->assertTrue($user->password_changed_at->greaterThan(now()->subMinute()));

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'password_changed',
            'user_id' => $user->id,
            'category' => 'security',
        ]);

        $log = AuditLog::query()->latest('id')->first();

        $this->assertSame('expired_policy', $log?->metadata['reason'] ?? null);
    }

    public function test_dashboard_receives_days_until_password_expiry_when_within_warning_window(): void
    {
        $user = User::factory()->create([
            'password_changed_at' => now()->subDays(80),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('days_until_password_expiry', 10));
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
