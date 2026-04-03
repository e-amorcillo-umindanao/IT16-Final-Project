<?php

namespace Tests\Feature;

use App\Http\Middleware\CheckIpPolicy;
use App\Models\IpRule;
use App\Models\User;
use App\Services\IpPolicyService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class IpRulesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_super_admin_can_view_the_ip_rules_page(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $this->withServerVariables([
            'REMOTE_ADDR' => '203.0.113.45',
        ])->actingAs($superAdmin)
            ->get(route('admin.ip-rules.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/IpRules')
                ->where('currentIp', '203.0.113.45'));
    }

    public function test_admin_cannot_view_the_ip_rules_page(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->get(route('admin.ip-rules.index'))
            ->assertForbidden();
    }

    public function test_super_admin_can_add_a_rule_and_it_is_audited(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $this->actingAs($superAdmin)
            ->post(route('admin.ip-rules.store'), [
                'type' => 'blocklist',
                'cidr' => '203.0.113.5/32',
                'label' => 'Demo attacker',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('ip_rules', [
            'type' => 'blocklist',
            'cidr' => '203.0.113.5/32',
            'label' => 'Demo attacker',
            'created_by' => $superAdmin->id,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'ip_rule_added',
            'category' => 'security',
            'user_id' => $superAdmin->id,
        ]);
    }

    public function test_invalid_cidr_is_rejected(): void
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super-admin');

        $this->actingAs($superAdmin)
            ->from(route('admin.ip-rules.index'))
            ->post(route('admin.ip-rules.store'), [
                'type' => 'blocklist',
                'cidr' => '999.999.0.0/24',
                'label' => 'Broken',
            ])
            ->assertRedirect(route('admin.ip-rules.index'))
            ->assertSessionHasErrors('cidr');
    }

    public function test_blocklisted_external_ip_is_denied_and_logged(): void
    {
        $user = User::factory()->create();

        IpRule::create([
            'type' => 'blocklist',
            'cidr' => '203.0.113.5/32',
            'label' => 'Blocked host',
            'created_by' => $user->id,
        ]);

        app(IpPolicyService::class)->clearCache();

        $this->assertFalse(app(IpPolicyService::class)->isAllowed('203.0.113.5'));

        $this->actingAs($user);

        $request = Request::create('/dashboard', 'GET', [], [], [], [
            'REMOTE_ADDR' => '203.0.113.5',
        ]);
        $request->setUserResolver(fn () => $user);

        try {
            app(CheckIpPolicy::class)->handle($request, fn () => response('ok'));
            $this->fail('Expected the middleware to block the request.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'access_blocked_ip',
            'category' => 'security',
            'user_id' => $user->id,
        ]);
    }

    public function test_private_ip_bypasses_the_blocklist(): void
    {
        $user = User::factory()->create();

        IpRule::create([
            'type' => 'blocklist',
            'cidr' => '127.0.0.1/32',
            'label' => 'Loopback',
            'created_by' => $user->id,
        ]);

        app(IpPolicyService::class)->clearCache();

        $this->assertTrue(app(IpPolicyService::class)->isAllowed('127.0.0.1'));

        $this->actingAs($user);

        $request = Request::create('/dashboard', 'GET', [], [], [], [
            'REMOTE_ADDR' => '127.0.0.1',
        ]);
        $request->setUserResolver(fn () => $user);

        $response = app(CheckIpPolicy::class)->handle($request, fn () => response('ok'));

        $this->assertSame(200, $response->getStatusCode());
    }

    public function test_allowlist_blocks_ips_outside_the_list(): void
    {
        $user = User::factory()->create();

        IpRule::create([
            'type' => 'allowlist',
            'cidr' => '198.51.100.0/24',
            'label' => 'Office',
            'created_by' => $user->id,
        ]);

        app(IpPolicyService::class)->clearCache();

        $this->assertFalse(app(IpPolicyService::class)->isAllowed('203.0.113.5'));

        $this->actingAs($user);

        $request = Request::create('/dashboard', 'GET', [], [], [], [
            'REMOTE_ADDR' => '203.0.113.5',
        ]);
        $request->setUserResolver(fn () => $user);

        try {
            app(CheckIpPolicy::class)->handle($request, fn () => response('ok'));
            $this->fail('Expected the allowlist middleware to block the request.');
        } catch (HttpException $exception) {
            $this->assertSame(403, $exception->getStatusCode());
        }
    }

    public function test_ip_policy_failures_do_not_block_the_request(): void
    {
        Log::spy();

        $user = User::factory()->create();

        $this->app->instance(IpPolicyService::class, new class extends IpPolicyService
        {
            public function isAllowed(string $ip): bool
            {
                throw new RuntimeException('boom');
            }
        });

        $response = $this->actingAs($user)->call(
            'GET',
            route('dashboard', absolute: false),
            [],
            [],
            [],
            ['REMOTE_ADDR' => '203.0.113.5'],
        );

        $response->assertOk();

        Log::shouldHaveReceived('error')->once();
    }
}
