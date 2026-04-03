<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\IpInfoService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AdminSessionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_sessions_page_exposes_user_filter_counts_and_locations(): void
    {
        $superAdmin = User::factory()->create([
            'name' => 'Zulu Super Admin',
        ]);
        $superAdmin->assignRole('super-admin');

        $alice = User::factory()->create([
            'name' => 'Alice User',
            'email' => 'alice@example.com',
        ]);

        $bob = User::factory()->create([
            'name' => 'Bob User',
            'email' => 'bob@example.com',
        ]);

        $this->mockIpInfo();

        $this->insertSession('alice-session', $alice->id, '203.0.113.10', now()->subMinutes(5)->timestamp, 'Mozilla/5.0');
        $this->insertSession('bob-session', $bob->id, '127.0.0.1', now()->subHours(30)->timestamp, null);

        $this->actingAs($superAdmin)
            ->get(route('admin.sessions'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Sessions/Index')
                ->where('selectedUser', null)
                ->where('terminableSessionsCount', 2)
                ->where('users.0.label', 'Alice User (alice@example.com)')
                ->where('users.1.label', 'Bob User (bob@example.com)')
                ->where('sessions.0.user_name', 'Alice User')
                ->where('sessions.0.location', 'Tokyo, JP')
                ->where('sessions.1.user_name', 'Bob User')
                ->where('sessions.1.location', null));
    }

    public function test_admin_sessions_page_can_filter_by_selected_user(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $alice = User::factory()->create([
            'name' => 'Alice User',
        ]);

        $bob = User::factory()->create([
            'name' => 'Bob User',
        ]);

        $this->mockIpInfo();

        $this->insertSession('alice-session', $alice->id, '203.0.113.10', now()->subMinutes(1)->timestamp, 'Mozilla/5.0');
        $this->insertSession('bob-session', $bob->id, '198.51.100.20', now()->subMinutes(2)->timestamp, 'Mozilla/5.0');

        $this->actingAs($superAdmin)
            ->get(route('admin.sessions', [
                'user_id' => $alice->id,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Sessions/Index')
                ->where('selectedUser', (string) $alice->id)
                ->has('sessions', 1)
                ->where('sessions.0.user_id', $alice->id)
                ->where('sessions.0.user_name', 'Alice User'));
    }

    public function test_personal_sessions_page_exposes_location_for_the_users_own_sessions(): void
    {
        $user = User::factory()->create();

        $this->mockIpInfo();

        $this->insertSession('my-session', $user->id, '203.0.113.99', now()->subMinutes(10)->timestamp, 'Mozilla/5.0');
        $this->insertSession('other-session', User::factory()->create()->id, '198.51.100.20', now()->subMinutes(20)->timestamp, 'Mozilla/5.0');

        $this->actingAs($user)
            ->get(route('sessions.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Sessions/Index')
                ->has('sessions', 1)
                ->where('sessions.0.id', 'my-session')
                ->where('sessions.0.location', 'Tokyo, JP'));
    }

    private function insertSession(
        string $id,
        int $userId,
        string $ipAddress,
        int $lastActivity,
        ?string $userAgent,
    ): void {
        DB::table(config('session.table', 'sessions'))->insert([
            'id' => $id,
            'user_id' => $userId,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'payload' => 'test',
            'last_activity' => $lastActivity,
        ]);
    }

    private function mockIpInfo(): void
    {
        $this->app->instance(IpInfoService::class, new class extends IpInfoService
        {
            public function lookup(string $ip): array
            {
                if ($ip === '127.0.0.1') {
                    return [
                        'city' => 'Local',
                        'region' => 'DEV',
                        'country' => 'DEV',
                        'location' => 'Local / DEV',
                    ];
                }

                return [
                    'city' => 'Tokyo',
                    'region' => 'Tokyo',
                    'country' => 'JP',
                    'location' => 'Tokyo, JP',
                ];
            }
        });
    }
}
