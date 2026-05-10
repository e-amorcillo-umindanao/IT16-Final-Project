<?php

namespace App\Services;

use App\Enums\AuditCategory;
use App\Models\AuditLog;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    public const HASH_VERSION_LEGACY_WITH_USER_ID = 1;

    public const HASH_VERSION_STABLE_ANONYMIZABLE = 2;

    /**
     * Central audit action classification map.
     *
     * @var array<string, AuditCategory>
     */
    private const ACTION_CATEGORIES = [
        'login_success' => AuditCategory::Security,
        'login_failed' => AuditCategory::Security,
        'login_blocked_inactive' => AuditCategory::Security,
        'account_locked' => AuditCategory::Security,
        'logout' => AuditCategory::Security,
        '2fa_enabled' => AuditCategory::Security,
        '2fa_disabled' => AuditCategory::Security,
        '2fa_verified' => AuditCategory::Security,
        '2fa_failed' => AuditCategory::Security,
        '2fa_corrupt_reset' => AuditCategory::Security,
        'recovery_code_used' => AuditCategory::Security,
        'recovery_code_failed' => AuditCategory::Security,
        'recovery_codes_regenerated' => AuditCategory::Security,
        'document_scan_blocked' => AuditCategory::Security,
        'malware_detected' => AuditCategory::Security,
        'integrity_violation' => AuditCategory::Security,
        'session_revoked' => AuditCategory::Security,
        'session_terminated' => AuditCategory::Security,
        'all_sessions_terminated' => AuditCategory::Security,
        'password_changed' => AuditCategory::Security,
        'email_verified' => AuditCategory::Security,
        'pwned_password_rejected' => AuditCategory::Security,
        'bot_detected' => AuditCategory::Security,
        'signed_url_generated' => AuditCategory::Security,
        'signed_url_accessed' => AuditCategory::Security,
        'audit_integrity_check' => AuditCategory::Security,
        'access_blocked_ip' => AuditCategory::Security,
        'ip_rule_added' => AuditCategory::Security,
        'ip_rule_removed' => AuditCategory::Security,
        'account_deletion_requested' => AuditCategory::Security,
        'account_deletion_cancelled' => AuditCategory::Security,
        'account_deletion_executed' => AuditCategory::Security,
        'google_oauth_login' => AuditCategory::Security,
        'google_oauth_login_failed' => AuditCategory::Security,
        'google_oauth_linked' => AuditCategory::Security,
        'google_oauth_unlinked' => AuditCategory::Security,
        'google_oauth_link_failed' => AuditCategory::Security,
        'google_oauth_denied' => AuditCategory::Security,

        'request' => AuditCategory::Audit,
        'profile_updated' => AuditCategory::Audit,
        'data_export_requested' => AuditCategory::Audit,
        'document_uploaded' => AuditCategory::Audit,
        'document_version_uploaded' => AuditCategory::Audit,
        'document_version_restored' => AuditCategory::Audit,
        'document_downloaded' => AuditCategory::Audit,
        'document_deleted' => AuditCategory::Audit,
        'document_restored' => AuditCategory::Audit,
        'document_starred' => AuditCategory::Audit,
        'document_unstarred' => AuditCategory::Audit,
        'document_shared' => AuditCategory::Audit,
        'share_revoked' => AuditCategory::Audit,
        'bulk_download' => AuditCategory::Audit,
        'bulk_delete' => AuditCategory::Audit,
        'document_permanently_deleted' => AuditCategory::Audit,
        'trash_emptied' => AuditCategory::Audit,
        'auto_purged' => AuditCategory::Audit,
        'user_activated' => AuditCategory::Audit,
        'user_deactivated' => AuditCategory::Audit,
        'user_role_changed' => AuditCategory::Audit,
        'two_factor_deadline_set' => AuditCategory::Security,
    ];

    /**
     * Log an immutable audit entry with HMAC hash chaining.
     */
    public function log(
        string $action,
        ?Model $auditable = null,
        ?array $metadata = null,
        AuditCategory|string|null $categoryOverride = null,
    ): AuditLog {
        return $this->writeLog(
            action: $action,
            userId: Auth::id(),
            auditable: $auditable,
            metadata: $metadata,
            categoryOverride: $categoryOverride,
        );
    }

    public function logForUser(
        Model $user,
        string $action,
        ?Model $auditable = null,
        ?array $metadata = null,
        AuditCategory|string|null $categoryOverride = null,
    ): AuditLog {
        return $this->writeLog(
            action: $action,
            userId: $user->getKey(),
            auditable: $auditable,
            metadata: $metadata,
            categoryOverride: $categoryOverride,
        );
    }

    public function logSystem(
        string $action,
        ?Model $auditable = null,
        ?array $metadata = null,
        AuditCategory|string|null $categoryOverride = null,
    ): AuditLog {
        return $this->writeLog(
            action: $action,
            userId: null,
            auditable: $auditable,
            metadata: $metadata,
            categoryOverride: $categoryOverride,
        );
    }

    private function writeLog(
        string $action,
        mixed $userId,
        ?Model $auditable = null,
        ?array $metadata = null,
        AuditCategory|string|null $categoryOverride = null,
    ): AuditLog {
        $ipAddress = Request::ip() ?? '0.0.0.0';
        $userAgent = Request::userAgent();
        $createdAt = now();
        $metadata = $metadata ?? [];
        $category = $this->resolveCategoryValue($action, $categoryOverride);

        $previousLog = AuditLog::latest('id')->first();
        $previousHash = $previousLog ? $previousLog->hash : null;

        $auditableType = $auditable ? get_class($auditable) : null;
        $auditableId = $auditable ? $auditable->getKey() : null;

        if (! array_key_exists('ip_address', $metadata)) {
            $metadata['ip_address'] = $ipAddress;
        }

        if ($auditable) {
            $originalName = $auditable->getAttribute('original_name');

            if (is_string($originalName) && $originalName !== '' && ! array_key_exists('document_name', $metadata)) {
                $metadata['document_name'] = $originalName;
            }

            $twoFactorEnabled = $auditable->getAttribute('two_factor_enabled');

            if (is_bool($twoFactorEnabled) && ! array_key_exists('two_factor', $metadata)) {
                $metadata['two_factor'] = $twoFactorEnabled;
            }
        }

        $hash = $this->buildHash(
            action: $action,
            category: $category,
            userId: $userId,
            auditableType: $auditableType,
            auditableId: $auditableId,
            ipAddress: $ipAddress,
            createdAt: $createdAt,
            metadata: $metadata,
            previousHash: $previousHash,
            hashVersion: self::HASH_VERSION_STABLE_ANONYMIZABLE,
        );

        return AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            'category' => $category,
            'auditable_type' => $auditableType,
            'auditable_id' => $auditableId,
            'metadata' => $metadata,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
            'hash' => $hash,
            'previous_hash' => $previousHash,
            'hash_version' => self::HASH_VERSION_STABLE_ANONYMIZABLE,
            'created_at' => $createdAt,
        ]);
    }

    /**
     * Verify the integrity of the audit log chain for the last N entries.
     *
     * @return array ['valid' => bool, 'broken_at' => ?int]
     */
    public function verifyChainIntegrity(?int $limit = 100): array
    {
        $logs = AuditLog::orderBy('id', 'desc')->limit($limit)->get()->reverse();

        foreach ($logs as $log) {
            $expectedHash = $this->hashForAuditLog($log);

            if (! hash_equals($expectedHash, $log->hash)) {
                return [
                    'valid' => false,
                    'broken_at' => $log->id,
                ];
            }
        }

        return [
            'valid' => true,
            'broken_at' => null,
        ];
    }

    public function categoryForAction(string $action): AuditCategory
    {
        return self::ACTION_CATEGORIES[$action] ?? AuditCategory::Audit;
    }

    /**
     * @return list<string>
     */
    public function knownActions(): array
    {
        return array_keys(self::ACTION_CATEGORIES);
    }

    public function hashForAuditLog(AuditLog $log, ?string $previousHash = null): string
    {
        $hashVersion = (int) ($log->hash_version ?: self::HASH_VERSION_LEGACY_WITH_USER_ID);

        return $this->buildHash(
            action: $log->action,
            category: $log->category ?? AuditCategory::Audit->value,
            userId: $log->user_id,
            auditableType: $log->auditable_type,
            auditableId: $log->auditable_id,
            ipAddress: $log->ip_address ?? '0.0.0.0',
            createdAt: $log->created_at,
            metadata: is_array($log->metadata) ? $log->metadata : null,
            previousHash: $previousHash ?? $log->previous_hash,
            hashVersion: $hashVersion,
        );
    }

    private function resolveCategoryValue(string $action, AuditCategory|string|null $categoryOverride): string
    {
        if ($categoryOverride instanceof AuditCategory) {
            return $categoryOverride->value;
        }

        if (is_string($categoryOverride) && AuditCategory::tryFrom($categoryOverride) instanceof AuditCategory) {
            return $categoryOverride;
        }

        return $this->categoryForAction($action)->value;
    }

    private function buildHash(
        string $action,
        string $category,
        mixed $userId,
        ?string $auditableType,
        mixed $auditableId,
        string $ipAddress,
        CarbonInterface $createdAt,
        ?array $metadata,
        ?string $previousHash,
        int $hashVersion = self::HASH_VERSION_LEGACY_WITH_USER_ID,
    ): string {
        $metadataJson = $this->encodeMetadataForHash($metadata);

        if ($hashVersion >= self::HASH_VERSION_STABLE_ANONYMIZABLE) {
            $dataToHash = implode('|', [
                $createdAt->toDateTimeString(),
                $action,
                $category,
                $ipAddress,
                $metadataJson,
                $auditableType ?? 'none',
                $auditableId ?? 'none',
                $previousHash ?? 'initial',
            ]);
        } else {
            $dataToHash = implode('|', [
                $action,
                $category,
                $userId ?? 'system',
                $auditableType ?? 'none',
                $auditableId ?? 'none',
                $ipAddress,
                $createdAt->toDateTimeString(),
                $metadataJson,
                $previousHash ?? 'initial',
            ]);
        }

        return hash_hmac('sha256', $dataToHash, config('app.key'));
    }

    private function encodeMetadataForHash(?array $metadata): string
    {
        if (empty($metadata)) {
            return '';
        }

        $normalizedMetadata = $this->sortMetadataKeysRecursively($metadata);

        return json_encode(
            $normalizedMetadata,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        ) ?: '';
    }

    private function sortMetadataKeysRecursively(array $value): array
    {
        if (array_is_list($value)) {
            return array_map(
                fn (mixed $item) => is_array($item) ? $this->sortMetadataKeysRecursively($item) : $item,
                $value,
            );
        }

        ksort($value);

        foreach ($value as $key => $item) {
            if (is_array($item)) {
                $value[$key] = $this->sortMetadataKeysRecursively($item);
            }
        }

        return $value;
    }
}
