<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Services\AuditDescriptionService;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionClass;
use Tests\TestCase;

class AuditActionConsistencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_badge_map_covers_every_audit_action_constant(): void
    {
        $serviceReflection = new ReflectionClass(AuditService::class);
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

    public function test_audit_integrity_check_description_uses_scope_and_result_summary(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'audit_integrity_check',
            'metadata' => [
                'scope' => 'full',
                'total_checked' => 1247,
                'failed' => 0,
            ],
        ]));

        $this->assertSame(
            'Verified audit log integrity (full chain - 1,247 entries, all passed)',
            $description,
        );
    }

    public function test_profile_updated_description_uses_avatar_action_details_when_present(): void
    {
        $uploadedDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'profile_updated',
            'metadata' => [
                'action_detail' => 'avatar_uploaded',
            ],
        ]));

        $removedDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'profile_updated',
            'metadata' => [
                'action_detail' => 'avatar_removed',
            ],
        ]));

        $defaultDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'profile_updated',
            'metadata' => [],
        ]));

        $this->assertSame('Updated profile picture', $uploadedDescription);
        $this->assertSame('Removed profile picture', $removedDescription);
        $this->assertSame('Updated profile information', $defaultDescription);
    }
}
