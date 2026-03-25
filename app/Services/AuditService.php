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
        'document_scan_blocked' => AuditCategory::Security,
        'malware_detected' => AuditCategory::Security,
        'integrity_violation' => AuditCategory::Security,
        'session_revoked' => AuditCategory::Security,
        'session_terminated' => AuditCategory::Security,
        'all_sessions_terminated' => AuditCategory::Security,
        'password_changed' => AuditCategory::Security,
        'pwned_password_rejected' => AuditCategory::Security,
        'share_link_generated' => AuditCategory::Security,
        'share_link_accessed' => AuditCategory::Security,

        'request' => AuditCategory::Audit,
        'profile_updated' => AuditCategory::Audit,
        'document_uploaded' => AuditCategory::Audit,
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
    ];

    /**
     * Log an immutable audit entry with HMAC hash chaining.
     *
     * @param string $action
     * @param Model|null $auditable
     * @param array|null $metadata
     * @return AuditLog
     */
    public function log(
        string $action,
        ?Model $auditable = null,
        ?array $metadata = null,
        AuditCategory|string|null $categoryOverride = null,
    ): AuditLog
    {
        $userId = Auth::id();
        $ipAddress = Request::ip() ?? '0.0.0.0';
        $userAgent = Request::userAgent();
        $createdAt = now();
        $metadata = $metadata ?? [];
        $category = $this->resolveCategoryValue($action, $categoryOverride);

        $previousLog = AuditLog::latest('id')->first();
        $previousHash = $previousLog ? $previousLog->hash : null;

        $auditableType = $auditable ? get_class($auditable) : null;
        $auditableId = $auditable ? $auditable->getKey() : null;

        if (!array_key_exists('ip_address', $metadata)) {
            $metadata['ip_address'] = $ipAddress;
        }

        if ($auditable) {
            $originalName = $auditable->getAttribute('original_name');

            if (is_string($originalName) && $originalName !== '' && !array_key_exists('document_name', $metadata)) {
                $metadata['document_name'] = $originalName;
            }

            $twoFactorEnabled = $auditable->getAttribute('two_factor_enabled');

            if (is_bool($twoFactorEnabled) && !array_key_exists('two_factor', $metadata)) {
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
            previousHash: $previousHash,
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
            'created_at' => $createdAt,
        ]);
    }

    /**
     * Verify the integrity of the audit log chain for the last N entries.
     *
     * @param int|null $limit
     * @return array ['valid' => bool, 'broken_at' => ?int]
     */
    public function verifyChainIntegrity(?int $limit = 100): array
    {
        $logs = AuditLog::orderBy('id', 'desc')->limit($limit)->get()->reverse();

        foreach ($logs as $log) {
            $expectedHash = $this->buildHash(
                action: $log->action,
                category: $log->category ?? AuditCategory::Audit->value,
                userId: $log->user_id,
                auditableType: $log->auditable_type,
                auditableId: $log->auditable_id,
                ipAddress: $log->ip_address,
                createdAt: $log->created_at,
                previousHash: $log->previous_hash,
            );

            if (!hash_equals($expectedHash, $log->hash)) {
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
        ?string $previousHash,
    ): string {
        $dataToHash = implode('|', [
            $action,
            $category,
            $userId ?? 'system',
            $auditableType ?? 'none',
            $auditableId ?? 'none',
            $ipAddress,
            $createdAt->toDateTimeString(),
            $previousHash ?? 'initial',
        ]);

        return hash_hmac('sha256', $dataToHash, config('app.key'));
    }
}
