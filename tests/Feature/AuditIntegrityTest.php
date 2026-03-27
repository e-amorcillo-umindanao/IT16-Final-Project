<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AuditIntegrityService;
use App\Services\AuditService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
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
            ->assertOk();
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
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'audit_integrity_check',
            'user_id' => $admin->id,
            'category' => 'security',
        ]);
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
}
