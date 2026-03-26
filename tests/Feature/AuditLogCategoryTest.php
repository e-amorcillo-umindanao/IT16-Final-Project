<?php

namespace Tests\Feature;

use App\Enums\AuditCategory;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuditLogCategoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_audit_service_assigns_categories_automatically_and_allows_overrides(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $auditService = app(AuditService::class);

        $loginLog = $auditService->log('login_success', $user);
        $documentLog = $auditService->log('document_uploaded');
        $overrideLog = $auditService->log('document_uploaded', null, [], AuditCategory::Security);

        $this->assertSame(AuditCategory::Security->value, $loginLog->category);
        $this->assertSame(AuditCategory::Audit->value, $documentLog->category);
        $this->assertSame(AuditCategory::Security->value, $overrideLog->category);
    }

    public function test_activity_csv_export_respects_the_category_filter(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $auditService = app(AuditService::class);
        $auditService->log('login_success', $user);
        $auditService->log('document_uploaded');

        $response = $this->get(route('activity.export', [
            'category' => AuditCategory::Security->value,
        ]));

        $response->assertOk();

        $csv = $response->streamedContent();

        $this->assertStringContainsString('login_success', $csv);
        $this->assertStringNotContainsString('document_uploaded', $csv);
    }

    public function test_new_audit_entries_with_metadata_pass_chain_verification(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $auditService = app(AuditService::class);

        $auditService->log('login_success', $user, [
            'location' => [
                'country' => 'PH',
                'city' => 'Davao',
            ],
            'device' => 'desktop',
        ]);
        $auditService->log('document_uploaded', null, [
            'document_name' => 'contract.pdf',
            'tags' => ['legal', 'signed'],
        ]);

        $this->assertSame([
            'valid' => true,
            'broken_at' => null,
        ], $auditService->verifyChainIntegrity());
    }

    public function test_metadata_tampering_breaks_the_hash_chain(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $auditService = app(AuditService::class);

        $firstLog = $auditService->log('login_success', $user, [
            'location' => [
                'country' => 'PH',
                'city' => 'Davao',
            ],
        ]);
        $auditService->log('document_uploaded', null, [
            'document_name' => 'report.pdf',
        ]);

        DB::table('audit_logs')
            ->where('id', $firstLog->id)
            ->update([
                'metadata' => json_encode([
                    'location' => [
                        'city' => 'Cebu',
                        'country' => 'PH',
                    ],
                    'ip_address' => '127.0.0.1',
                ]),
            ]);

        $result = $auditService->verifyChainIntegrity();

        $this->assertFalse($result['valid']);
        $this->assertSame($firstLog->id, $result['broken_at']);
    }

    public function test_category_tampering_breaks_the_hash_chain(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user);

        $auditService = app(AuditService::class);

        $auditService->log('login_success', $user, [
            'location' => 'Davao, PH',
        ]);
        $secondLog = $auditService->log('document_uploaded', null, [
            'document_name' => 'evidence.pdf',
        ]);

        DB::table('audit_logs')
            ->where('id', $secondLog->id)
            ->update([
                'category' => AuditCategory::Security->value,
            ]);

        $result = $auditService->verifyChainIntegrity();

        $this->assertFalse($result['valid']);
        $this->assertSame($secondLog->id, $result['broken_at']);
    }
}
