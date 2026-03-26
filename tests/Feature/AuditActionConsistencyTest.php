<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Services\AuditDescriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionClass;
use Tests\TestCase;

class AuditActionConsistencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_badge_map_covers_every_audit_action_constant(): void
    {
        $serviceReflection = new ReflectionClass(\App\Services\AuditService::class);
        $actionCategories = $serviceReflection->getConstant('ACTION_CATEGORIES');

        $badgeFile = file_get_contents(resource_path('js/lib/auditActionBadge.ts'));

        $this->assertIsString($badgeFile);

        foreach (array_keys($actionCategories) as $action) {
            $pattern = sprintf("/['\"]?%s['\"]?\\s*:/", preg_quote($action, '/'));

            $this->assertSame(
                1,
                preg_match($pattern, $badgeFile),
                "Missing audit badge entry for [{$action}].",
            );
        }

        $this->assertStringNotContainsString('share_link_generated:', $badgeFile);
        $this->assertStringNotContainsString('share_link_accessed:', $badgeFile);
    }

    public function test_signed_url_generated_description_matches_the_spec(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'signed_url_generated',
            'metadata' => [
                'document_name' => 'filename.pdf',
                'expires_hours' => 24,
            ],
        ]));

        $this->assertSame("Generated share link for 'filename.pdf' (24h)", $description);
    }

    public function test_signed_url_accessed_description_is_human_readable(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'signed_url_accessed',
            'metadata' => [
                'document_name' => 'filename.pdf',
            ],
        ]));

        $this->assertSame("Accessed share link for 'filename.pdf'", $description);
    }

    public function test_bulk_download_description_uses_the_document_count(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'bulk_download',
            'metadata' => [
                'count' => 3,
            ],
        ]));

        $this->assertSame('Downloaded 3 document(s) as ZIP', $description);
    }

    public function test_login_blocked_inactive_description_is_specific(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'login_blocked_inactive',
            'metadata' => [],
        ]));

        $this->assertSame('Sign-in blocked - account is inactive', $description);
    }

    public function test_user_role_changed_description_uses_target_name_and_role(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'user_role_changed',
            'metadata' => [
                'new_role' => 'Admin',
                'target_name' => 'John Doe',
            ],
        ]));

        $this->assertSame('Changed role of John Doe to Admin', $description);
    }
}
