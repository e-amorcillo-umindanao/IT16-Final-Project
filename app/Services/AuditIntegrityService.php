<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Builder;

class AuditIntegrityService
{
    private const RECENT_LIMIT = 500;

    private const FAILURE_LIMIT = 50;

    protected AuditService $auditService;

    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Verify the audit log hash chain.
     *
     * @return array{
     *     scope: string,
     *     total_checked: int,
     *     passed: int,
     *     failed: int,
     *     chain_intact: bool,
     *     failures: array<int, array{
     *         id: int,
     *         action: string,
     *         category: string|null,
     *         created_at: string|null,
     *         failure_type: string,
     *         expected_hash: string,
     *         stored_hash: string
     *     }>,
     *     verified_at: string,
     *     duration_ms: int
     * }
     */
    public function verifyChain(string $scope = 'full'): array
    {
        $scope = $scope === 'recent' ? 'recent' : 'full';
        $startedAt = hrtime(true);

        [$query, $previousStoredHash, $previousExpectedHash] = $this->verificationQuery($scope);
        $totalChecked = (clone $query)->count();

        if ($totalChecked === 0) {
            return $this->buildResult(
                scope: $scope,
                totalChecked: 0,
                failedCount: 0,
                failures: [],
                startedAt: $startedAt,
            );
        }

        $failedCount = 0;
        $failures = [];

        foreach ($query->cursor() as $log) {
            $expectedHash = $this->auditService->hashForAuditLog($log, $previousExpectedHash);
            $storedHash = is_string($log->hash) ? $log->hash : '';
            $storedPreviousHash = $log->previous_hash;

            $hasChainBreak = $storedPreviousHash !== $previousStoredHash;
            $hasHashMismatch = ! hash_equals($expectedHash, $storedHash);

            if ($hasChainBreak || $hasHashMismatch) {
                $failedCount++;

                if (count($failures) < self::FAILURE_LIMIT) {
                    $failures[] = [
                        'id' => $log->id,
                        'action' => $log->action,
                        'category' => $log->category,
                        'created_at' => $log->created_at?->toIso8601String(),
                        'failure_type' => $hasChainBreak ? 'chain_break' : 'hash_mismatch',
                        'expected_hash' => $this->truncateHash($expectedHash),
                        'stored_hash' => $this->truncateHash($storedHash),
                    ];
                }
            }

            $previousStoredHash = $storedHash;
            $previousExpectedHash = $expectedHash;
        }

        return $this->buildResult(
            scope: $scope,
            totalChecked: $totalChecked,
            failedCount: $failedCount,
            failures: $failures,
            startedAt: $startedAt,
        );
    }

    /**
     * @return array{0: Builder<AuditLog>, 1: string|null, 2: string|null}
     */
    private function verificationQuery(string $scope): array
    {
        if ($scope !== 'recent') {
            return [
                AuditLog::query()->orderBy('id'),
                null,
                null,
            ];
        }

        $recentIds = AuditLog::query()
            ->orderByDesc('id')
            ->limit(self::RECENT_LIMIT)
            ->pluck('id');

        if ($recentIds->isEmpty()) {
            return [
                AuditLog::query()->where('id', 0),
                null,
                null,
            ];
        }

        $startId = (int) $recentIds->min();
        $boundaryHash = AuditLog::query()
            ->where('id', '<', $startId)
            ->orderByDesc('id')
            ->value('hash');

        return [
            AuditLog::query()
                ->where('id', '>=', $startId)
                ->orderBy('id'),
            $boundaryHash,
            $boundaryHash,
        ];
    }

    /**
     * @param array<int, array{
     *     id: int,
     *     action: string,
     *     category: string|null,
     *     created_at: string|null,
     *     failure_type: string,
     *     expected_hash: string,
     *     stored_hash: string
     * }> $failures
     * @return array{
     *     scope: string,
     *     total_checked: int,
     *     passed: int,
     *     failed: int,
     *     chain_intact: bool,
     *     failures: array<int, array{
     *         id: int,
     *         action: string,
     *         category: string|null,
     *         created_at: string|null,
     *         failure_type: string,
     *         expected_hash: string,
     *         stored_hash: string
     *     }>,
     *     verified_at: string,
     *     duration_ms: int
     * }
     */
    private function buildResult(
        string $scope,
        int $totalChecked,
        int $failedCount,
        array $failures,
        int $startedAt,
    ): array {
        return [
            'scope' => $scope,
            'total_checked' => $totalChecked,
            'passed' => max($totalChecked - $failedCount, 0),
            'failed' => $failedCount,
            'chain_intact' => $failedCount === 0,
            'failures' => $failures,
            'verified_at' => now()->toIso8601String(),
            'duration_ms' => (int) round((hrtime(true) - $startedAt) / 1_000_000),
        ];
    }

    private function truncateHash(?string $hash): string
    {
        if (! is_string($hash) || $hash === '') {
            return '-';
        }

        return substr($hash, 0, 12).'...';
    }
}
