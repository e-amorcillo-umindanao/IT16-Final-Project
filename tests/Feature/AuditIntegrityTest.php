<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\AuditLog;
use App\Services\AuditIntegrityService;
use App\Services\AuditService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AuditIntegrityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RolePermissionSeeder::class);
    }

    public function test_admin_can_view_the_audit_integrity_page(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->get(route('admin.audit-integrity'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AuditIntegrity')
                ->where('lastVerified', null)
                ->where('history', []));
    }

    public function test_regular_users_cannot_view_the_audit_integrity_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('admin.audit-integrity'))
            ->assertForbidden();
    }

    public function test_verification_logs_an_audit_integrity_check_entry(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->post(route('admin.audit-integrity.verify'), [
                'scope' => 'full',
            ])
            ->assertRedirect(route('admin.audit-integrity'));

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'audit_integrity_check',
            'user_id' => $admin->id,
            'category' => 'security',
        ]);
    }

    public function test_verification_response_exposes_last_verified_and_history_props(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->post(route('admin.audit-integrity.verify'), [
                'scope' => 'recent',
            ])
            ->assertRedirect(route('admin.audit-integrity'));

        $this->actingAs($admin)
            ->get(route('admin.audit-integrity'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AuditIntegrity')
                ->where('results.scope', 'recent')
                ->where('lastVerified.mode', 'recent')
                ->where('lastVerified.fail_count', 0)
                ->where('lastVerified.result', 'pass')
                ->has('history', 1)
                ->where('history.0.mode', 'recent'));
    }

    public function test_verification_history_uses_a_twelve_hour_timestamp_format(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->post(route('admin.audit-integrity.verify'), [
                'scope' => 'recent',
            ])
            ->assertRedirect(route('admin.audit-integrity'));

        $log = AuditLog::query()->where('action', 'audit_integrity_check')->latest('id')->firstOrFail();

        DB::table('audit_logs')
            ->where('id', $log->id)
            ->update([
                'created_at' => '2026-05-04 00:21:21',
            ]);

        $this->actingAs($admin)
            ->get(route('admin.audit-integrity'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/AuditIntegrity')
                ->where('lastVerified.timestamp', 'May 4, 2026 12:21:21 AM')
                ->where('history.0.timestamp', 'May 4, 2026 12:21:21 AM'));
    }

    public function test_recent_scope_only_checks_the_last_five_hundred_entries(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $auditService = app(AuditService::class);

        for ($index = 0; $index < 600; $index++) {
            $auditService->log('document_uploaded', null, [
                'document_name' => "file-{$index}.pdf",
            ]);
        }

        $result = app(AuditIntegrityService::class)->verifyChain('recent');

        $this->assertSame('recent', $result['scope']);
        $this->assertSame(500, $result['total_checked']);
        $this->assertTrue($result['chain_intact']);
    }

    public function test_category_tampering_causes_hash_mismatch_on_that_entry_and_downstream_entries(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $auditService = app(AuditService::class);

        $auditService->log('login_success', $user, [
            'location' => 'Davao, PH',
        ]);
        $tamperedLog = $auditService->log('document_uploaded', null, [
            'document_name' => 'evidence.pdf',
        ]);
        $downstreamLog = $auditService->log('document_downloaded', null, [
            'document_name' => 'evidence.pdf',
        ]);

        DB::table('audit_logs')
            ->where('id', $tamperedLog->id)
            ->update([
                'category' => 'security',
            ]);

        $result = app(AuditIntegrityService::class)->verifyChain('full');

        $this->assertFalse($result['chain_intact']);
        $this->assertSame(2, $result['failed']);
        $this->assertSame($tamperedLog->id, $result['failures'][0]['id']);
        $this->assertSame('hash_mismatch', $result['failures'][0]['failure_type']);
        $this->assertSame($downstreamLog->id, $result['failures'][1]['id']);
        $this->assertSame('hash_mismatch', $result['failures'][1]['failure_type']);
    }

    public function test_hash_tampering_causes_a_chain_break_on_the_next_entry(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $auditService = app(AuditService::class);

        $tamperedLog = $auditService->log('login_success', $user, [
            'location' => 'Davao, PH',
        ]);
        $nextLog = $auditService->log('document_uploaded', null, [
            'document_name' => 'evidence.pdf',
        ]);

        DB::table('audit_logs')
            ->where('id', $tamperedLog->id)
            ->update([
                'hash' => str_repeat('a', 64),
            ]);

        $result = app(AuditIntegrityService::class)->verifyChain('full');

        $this->assertFalse($result['chain_intact']);
        $this->assertSame(2, $result['failed']);
        $this->assertSame($tamperedLog->id, $result['failures'][0]['id']);
        $this->assertSame('hash_mismatch', $result['failures'][0]['failure_type']);
        $this->assertSame($nextLog->id, $result['failures'][1]['id']);
        $this->assertSame('chain_break', $result['failures'][1]['failure_type']);
    }

    public function test_admin_can_download_an_integrity_report_pdf(): void
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $this->actingAs($admin)
            ->post(route('admin.audit-integrity.verify'), [
                'scope' => 'recent',
            ])
            ->assertRedirect(route('admin.audit-integrity'));

        $response = $this->actingAs($admin)
            ->get(route('admin.audit-integrity.export-pdf'));

        $response->assertOk();
        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type', ''));
        $this->assertStringContainsString('integrity-report-', $response->headers->get('content-disposition', ''));
        $this->assertSame(1, AuditLog::query()->where('action', 'audit_integrity_check')->count());
    }
}
