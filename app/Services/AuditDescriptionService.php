<?php

namespace App\Services;

use App\Models\AuditLog;

class AuditDescriptionService
{
    public function generate(AuditLog $log): string
    {
        $meta = $log->metadata ?? [];
        $documentName = $meta['document_name'] ?? $meta['original_name'] ?? null;
        $location = $this->formatLocation($meta['location'] ?? null);

        return match ($log->action) {
            'login_success' => $location
                ? "Signed in from {$location}"
                : 'Signed in successfully',
            'login_failed' => $location
                ? "Failed sign-in attempt from {$location}"
                : 'Failed sign-in attempt',
            'login_blocked_inactive' => 'Sign-in blocked - account is inactive',
            'account_locked' => $location
                ? "Account locked after repeated failures from {$location}"
                : 'Account locked after repeated failed attempts',
            'logout' => 'Signed out',
            'email_verified' => 'Verified email address',
            '2fa_enabled', 'two_factor_enabled' => 'Two-factor authentication enabled',
            '2fa_disabled', 'two_factor_disabled' => 'Two-factor authentication disabled',
            '2fa_verified' => 'Two-factor authentication verified',
            '2fa_failed' => 'Invalid 2FA code submitted',
            '2fa_corrupt_reset' => '2FA setup was invalid and has been reset',
            'recovery_code_used' => isset($meta['remaining_codes'])
                ? "Signed in using a recovery code ({$meta['remaining_codes']} remaining)"
                : 'Signed in using a recovery code',
            'recovery_code_failed' => 'Invalid recovery code submitted',
            'recovery_codes_regenerated' => 'Regenerated 2FA recovery codes',
            'bot_detected' => isset($meta['form_action'])
                ? "Bot verification failed on {$meta['form_action']} form"
                : 'Bot verification failed',
            'audit_integrity_check' => $this->describeIntegrityCheck($meta),
            'access_blocked_ip' => $location
                ? "Access denied by IP policy from {$location}"
                : 'Access denied by IP policy',
            'ip_rule_added' => isset($meta['type'], $meta['cidr'])
                ? "Added {$meta['type']} rule for {$meta['cidr']}"
                : 'Added an IP policy rule',
            'ip_rule_removed' => isset($meta['type'], $meta['cidr'])
                ? "Removed {$meta['type']} rule for {$meta['cidr']}"
                : 'Removed an IP policy rule',
            'account_deletion_requested' => isset($meta['scheduled_for'])
                ? "Requested permanent account deletion (scheduled for {$meta['scheduled_for']})"
                : 'Requested permanent account deletion',
            'account_deletion_cancelled' => 'Cancelled account deletion request',
            'account_deletion_executed' => 'Account permanently deleted and data purged',
            'google_oauth_login' => $location
                ? "Signed in via Google OAuth from {$location}"
                : 'Signed in via Google OAuth',
            'google_oauth_login_failed' => 'Google OAuth sign-in failed: '.($meta['reason'] ?? 'unknown reason'),
            'google_oauth_linked' => 'Linked Google account ('.($meta['google_email'] ?? '').')',
            'google_oauth_unlinked' => 'Unlinked Google account',
            'google_oauth_link_failed' => 'Failed to link Google account: '.($meta['reason'] ?? 'unknown reason'),
            'google_oauth_denied' => 'Google OAuth authorization was denied by user',
            'document_uploaded' => $documentName
                ? "Uploaded '{$documentName}'"
                : 'Uploaded a document',
            'data_export_requested' => 'Requested a personal data export',
            'document_version_uploaded' => ($documentName && isset($meta['version_number']))
                ? "Replaced '{$documentName}' (now v{$meta['version_number']})"
                : 'Replaced a document version',
            'document_version_restored' => ($documentName && isset($meta['restored_to_version']))
                ? "Restored '{$documentName}' to version {$meta['restored_to_version']}"
                : 'Restored a document version',
            'document_downloaded' => $documentName
                ? "Downloaded '{$documentName}'"
                : 'Downloaded a document',
            'document_deleted' => $documentName
                ? "Moved '{$documentName}' to trash"
                : 'Moved a document to trash',
            'document_restored' => $documentName
                ? "Restored '{$documentName}' from trash"
                : 'Restored a document from trash',
            'document_starred' => $documentName
                ? "Starred '{$documentName}'"
                : 'Starred a document',
            'document_unstarred' => $documentName
                ? "Unstarred '{$documentName}'"
                : 'Unstarred a document',
            'integrity_violation' => $documentName
                ? "Integrity check failed for '{$documentName}'"
                : 'File integrity check failed',
            'document_shared' => ($documentName && isset($meta['shared_with']))
                ? "Shared '{$documentName}' with {$meta['shared_with']}"
                : 'Shared a document',
            'share_revoked' => $documentName
                ? "Revoked share for '{$documentName}'"
                : 'Revoked a document share',
            'bulk_download' => isset($meta['count'])
                ? "Downloaded {$meta['count']} document(s) as ZIP"
                : 'Downloaded multiple document(s) as ZIP',
            'signed_url_generated' => ($documentName && isset($meta['expires_hours']))
                ? "Generated share link for '{$documentName}' ({$meta['expires_hours']}h)"
                : 'Generated a signed share link',
            'signed_url_accessed' => $documentName
                ? "Accessed share link for '{$documentName}'"
                : 'Accessed a share link',
            'malware_detected' => $documentName
                ? ((isset($meta['detected_at']) && $meta['detected_at'] === 'async_queue')
                    ? "Malicious file '{$documentName}' detected after upload and removed"
                    : "Blocked upload of '{$documentName}' - malware detected")
                : 'Blocked a malicious file upload',
            'document_scan_blocked' => $documentName
                ? "Blocked upload of '{$documentName}' - malware detected"
                : 'Blocked a malicious file upload',
            'password_changed' => match ($meta['reason'] ?? null) {
                'expired_policy' => 'Changed password - previous password had expired',
                default => 'Changed account password',
            },
            'profile_updated' => $this->describeProfileUpdate($meta),
            'user_role_changed' => isset($meta['new_role'], $meta['target_name'])
                ? "Changed role of {$meta['target_name']} to {$meta['new_role']}"
                : 'Changed a user role',
            default => ucwords(str_replace('_', ' ', $log->action)),
        };
    }

    private function describeIntegrityCheck(array $metadata): string
    {
        $scope = ($metadata['scope'] ?? 'full') === 'recent'
            ? 'recent 500 entries'
            : 'full chain';

        $totalChecked = isset($metadata['total_checked'])
            ? number_format((int) $metadata['total_checked'])
            : null;
        $failedCount = isset($metadata['failed'])
            ? (int) $metadata['failed']
            : null;

        if ($totalChecked === null) {
            return 'Verified audit log integrity';
        }

        $summary = $failedCount === null
            ? null
            : ($failedCount === 0
                ? 'all passed'
                : number_format($failedCount).' failures detected');

        return $summary === null
            ? "Verified audit log integrity ({$scope} - {$totalChecked} entries)"
            : "Verified audit log integrity ({$scope} - {$totalChecked} entries, {$summary})";
    }

    private function describeProfileUpdate(array $metadata): string
    {
        return match ($metadata['action_detail'] ?? null) {
            'avatar_uploaded' => 'Updated profile picture',
            'avatar_removed' => 'Removed profile picture',
            default => 'Updated profile information',
        };
    }

    private function formatLocation(mixed $location): ?string
    {
        if (is_string($location) && $location !== '') {
            return $location;
        }

        if (! is_array($location)) {
            return null;
        }

        $city = $location['city'] ?? null;
        $country = $location['country'] ?? null;
        $region = $location['region'] ?? null;

        return collect([$city, $region, $country])
            ->filter(fn ($value) => is_string($value) && $value !== '')
            ->implode(', ') ?: null;
    }
}
