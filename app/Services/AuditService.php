<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /**
     * Log an immutable audit entry with HMAC hash chaining.
     *
     * @param string $action
     * @param Model|null $auditable
     * @param array|null $metadata
     * @return AuditLog
     */
    public function log(string $action, ?Model $auditable = null, ?array $metadata = null): AuditLog
    {
        $userId = Auth::id();
        $ipAddress = Request::ip() ?? '0.0.0.0';
        $userAgent = Request::userAgent();
        $createdAt = now();

        $previousLog = AuditLog::latest('id')->first();
        $previousHash = $previousLog ? $previousLog->hash : null;

        $auditableType = $auditable ? get_class($auditable) : null;
        $auditableId = $auditable ? $auditable->getKey() : null;

        // Data to hash for tamper detection: action|user_id|auditable_type|auditable_id|ip_address|created_at|previous_hash
        $dataToHash = implode('|', [
            $action,
            $userId ?? 'system',
            $auditableType ?? 'none',
            $auditableId ?? 'none',
            $ipAddress,
            $createdAt->toDateTimeString(),
            $previousHash ?? 'initial',
        ]);

        $hash = hash_hmac('sha256', $dataToHash, config('app.key'));

        return AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
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
            $dataToHash = implode('|', [
                $log->action,
                $log->user_id ?? 'system',
                $log->auditable_type ?? 'none',
                $log->auditable_id ?? 'none',
                $log->ip_address,
                $log->created_at->toDateTimeString(),
                $log->previous_hash ?? 'initial',
            ]);

            $expectedHash = hash_hmac('sha256', $dataToHash, config('app.key'));

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
}
