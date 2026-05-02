<?php

use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->unsignedTinyInteger('hash_version')
                ->default(AuditService::HASH_VERSION_LEGACY_WITH_USER_ID)
                ->after('previous_hash');
        });

        $previousHash = null;

        DB::table('audit_logs')
            ->orderBy('id')
            ->get()
            ->each(function (object $log) use (&$previousHash): void {
                $hash = $this->buildStableHash($log, $previousHash);

                DB::table('audit_logs')
                    ->where('id', $log->id)
                    ->update([
                        'previous_hash' => $previousHash,
                        'hash' => $hash,
                        'hash_version' => AuditService::HASH_VERSION_STABLE_ANONYMIZABLE,
                    ]);

                $previousHash = $hash;
            });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn('hash_version');
        });
    }

    private function buildStableHash(object $log, ?string $previousHash): string
    {
        $metadata = is_string($log->metadata ?? null)
            ? json_decode($log->metadata, true)
            : null;

        $metadataJson = $this->encodeMetadataForHash(is_array($metadata) ? $metadata : null);
        $createdAt = Carbon::parse($log->created_at ?? now())->toDateTimeString();

        $dataToHash = implode('|', [
            $createdAt,
            $log->action,
            $log->category ?? 'audit',
            $log->ip_address ?? '0.0.0.0',
            $metadataJson,
            $log->auditable_type ?? 'none',
            $log->auditable_id ?? 'none',
            $previousHash ?? 'initial',
        ]);

        return hash_hmac('sha256', $dataToHash, config('app.key'));
    }

    private function encodeMetadataForHash(?array $metadata): string
    {
        if (empty($metadata)) {
            return '';
        }

        return json_encode(
            $this->sortMetadataKeysRecursively($metadata),
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
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
};
