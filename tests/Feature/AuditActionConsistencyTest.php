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

    public function test_email_verified_description_matches_the_spec(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'email_verified',
            'metadata' => [],
        ]));

        $this->assertSame('Email address verified successfully.', $description);
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

    public function test_access_blocked_ip_description_uses_location_without_exposing_raw_ip(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'access_blocked_ip',
            'metadata' => [
                'ip' => '203.0.113.5',
                'location' => [
                    'city' => 'Davao City',
                    'country' => 'PH',
                ],
            ],
        ]));

        $this->assertSame('Access denied by IP policy from Davao City, PH', $description);
    }

    public function test_ip_rule_added_description_uses_the_rule_details(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'ip_rule_added',
            'metadata' => [
                'type' => 'blocklist',
                'cidr' => '203.0.113.5/32',
            ],
        ]));

        $this->assertSame('Added blocklist rule for 203.0.113.5/32', $description);
    }

    public function test_ip_rule_removed_description_uses_the_rule_details(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'ip_rule_removed',
            'metadata' => [
                'type' => 'allowlist',
                'cidr' => '198.51.100.0/24',
            ],
        ]));

        $this->assertSame('Removed allowlist rule for 198.51.100.0/24', $description);
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

    public function test_document_version_descriptions_follow_the_spec(): void
    {
        $uploadedDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'document_version_uploaded',
            'metadata' => [
                'document_name' => 'proposal.pdf',
                'version_number' => 3,
            ],
        ]));

        $restoredDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'document_version_restored',
            'metadata' => [
                'document_name' => 'proposal.pdf',
                'restored_to_version' => 1,
            ],
        ]));

        $this->assertSame("Replaced 'proposal.pdf' (now v3)", $uploadedDescription);
        $this->assertSame("Restored 'proposal.pdf' to version 1", $restoredDescription);
    }

    public function test_data_export_requested_description_is_human_readable(): void
    {
        $description = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'data_export_requested',
            'metadata' => [],
        ]));

        $this->assertSame('Requested a personal data export', $description);
    }

    public function test_account_deletion_descriptions_are_human_readable(): void
    {
        $requestedDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'account_deletion_requested',
            'metadata' => [
                'scheduled_for' => '2026-04-27',
            ],
        ]));

        $cancelledDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'account_deletion_cancelled',
            'metadata' => [],
        ]));

        $executedDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'account_deletion_executed',
            'metadata' => [],
        ]));

        $this->assertSame('Requested permanent account deletion (scheduled for 2026-04-27)', $requestedDescription);
        $this->assertSame('Cancelled account deletion request', $cancelledDescription);
        $this->assertSame('Account permanently deleted and data purged', $executedDescription);
    }

    public function test_password_changed_description_uses_the_expired_policy_reason_when_present(): void
    {
        $expiredDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'password_changed',
            'metadata' => [
                'reason' => 'expired_policy',
            ],
        ]));

        $defaultDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'password_changed',
            'metadata' => [],
        ]));

        $this->assertSame('Changed password - previous password had expired', $expiredDescription);
        $this->assertSame('Changed account password', $defaultDescription);
    }

    public function test_recovery_code_descriptions_are_human_readable(): void
    {
        $usedDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'recovery_code_used',
            'metadata' => [
                'remaining_codes' => 6,
            ],
        ]));

        $failedDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'recovery_code_failed',
            'metadata' => [],
        ]));

        $regeneratedDescription = app(AuditDescriptionService::class)->generate(new AuditLog([
            'action' => 'recovery_codes_regenerated',
            'metadata' => [],
        ]));

        $this->assertSame('Signed in using a recovery code (6 remaining)', $usedDescription);
        $this->assertSame('Invalid recovery code submitted', $failedDescription);
        $this->assertSame('Regenerated 2FA recovery codes', $regeneratedDescription);
    }
}
