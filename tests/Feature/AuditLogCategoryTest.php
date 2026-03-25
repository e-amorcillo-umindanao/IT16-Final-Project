<?php

namespace Tests\Feature;

use App\Enums\AuditCategory;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
