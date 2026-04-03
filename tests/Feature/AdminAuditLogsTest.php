<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AuditService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use ReflectionClass;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AdminAuditLogsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_audit_logs_page_exposes_user_filter_and_hourly_chart_props(): void
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

        $auditService = app(AuditService::class);

        $securityLog = $auditService->logForUser($alice, 'login_failed', null, [
            'ip_address' => '203.0.113.10',
        ]);
        $auditLog = $auditService->logForUser($bob, 'document_uploaded', null, [
            'document_name' => 'report.pdf',
        ]);

        DB::table('audit_logs')->where('id', $securityLog->id)->update([
            'created_at' => now()->startOfDay()->addHours(9),
        ]);
        DB::table('audit_logs')->where('id', $auditLog->id)->update([
            'created_at' => now()->startOfDay()->addHours(10),
        ]);

        $this->actingAs($superAdmin)
            ->get(route('admin.audit-logs'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AuditLogs/Index')
                ->where('selectedUser', null)
                ->where('users.0.label', 'Alice User (alice@example.com)')
                ->where('users.1.label', 'Bob User (bob@example.com)')
                ->has('hourlyChart', 24)
                ->where('hourlyChart.9.hour', '09:00')
                ->where('hourlyChart.9.security', 1)
                ->where('hourlyChart.9.audit', 0)
                ->where('hourlyChart.10.hour', '10:00')
                ->where('hourlyChart.10.security', 0)
                ->where('hourlyChart.10.audit', 1));
    }

    public function test_admin_audit_logs_can_filter_by_user_id(): void
    {
        $superAdmin = User::factory()->create([
            'name' => 'Zulu Super Admin',
        ]);
        $superAdmin->assignRole('super-admin');

        $alice = User::factory()->create([
            'name' => 'Alice User',
        ]);

        $bob = User::factory()->create([
            'name' => 'Bob User',
        ]);

        $auditService = app(AuditService::class);
        $aliceLog = $auditService->logForUser($alice, 'login_success');
        $auditService->logForUser($bob, 'document_uploaded');

        $this->actingAs($superAdmin)
            ->get(route('admin.audit-logs', [
                'user_id' => $alice->id,
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AuditLogs/Index')
                ->where('selectedUser', (string) $alice->id)
                ->where('logs.data.0.id', $aliceLog->id)
                ->where('logs.data.0.user_id', $alice->id)
                ->has('logs.data', 1));
    }

    public function test_admin_audit_logs_action_filter_covers_every_audit_action(): void
    {
        $serviceReflection = new ReflectionClass(AuditService::class);
        $actionCategories = $serviceReflection->getConstant('ACTION_CATEGORIES');
        $pageFile = file_get_contents(resource_path('js/Pages/Admin/AuditLogs/Index.tsx'));

        $this->assertIsString($pageFile);

        foreach (array_keys($actionCategories) as $action) {
            $pattern = sprintf("/value:\\s*['\"]%s['\"]/", preg_quote($action, '/'));

            $this->assertSame(
                1,
                preg_match($pattern, $pageFile),
                "Missing admin audit log action filter option for [{$action}].",
            );
        }
    }
}
