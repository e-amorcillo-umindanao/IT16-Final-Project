<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->string('scan_result_state', 50)
                ->default('unscanned')
                ->after('file_hash');
        });

        DB::table('documents')
            ->select(['id', 'scan_result'])
            ->orderBy('id')
            ->each(function (object $document): void {
                DB::table('documents')
                    ->where('id', $document->id)
                    ->update([
                        'scan_result_state' => $this->normalizeLegacyScanResult($document->scan_result),
                    ]);
            });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('scan_result');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->renameColumn('scan_result_state', 'scan_result');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->json('scan_result_legacy')->nullable()->after('file_hash');
        });

        DB::table('documents')
            ->select(['id', 'scan_result'])
            ->orderBy('id')
            ->each(function (object $document): void {
                DB::table('documents')
                    ->where('id', $document->id)
                    ->update([
                        'scan_result_legacy' => $this->toLegacyJson($document->scan_result),
                    ]);
            });

        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn('scan_result');
        });

        Schema::table('documents', function (Blueprint $table) {
            $table->renameColumn('scan_result_legacy', 'scan_result');
        });
    }

    private function normalizeLegacyScanResult(mixed $value): string
    {
        if (is_string($value) && in_array($value, ['pending', 'clean', 'unscanned', 'unavailable', 'malicious'], true)) {
            return $value;
        }

        if (!is_string($value) || trim($value) === '') {
            return 'unscanned';
        }

        $decoded = json_decode($value, true);

        if (!is_array($decoded)) {
            return 'unscanned';
        }

        $status = $decoded['status'] ?? null;
        $malicious = (int) ($decoded['malicious'] ?? 0);
        $suspicious = (int) ($decoded['suspicious'] ?? 0);

        if ($status === 'completed') {
            return ($malicious > 0 || $suspicious > 0) ? 'malicious' : 'clean';
        }

        if ($status === 'pending') {
            return 'pending';
        }

        if (in_array($status, ['unavailable', 'timeout', 'error'], true)) {
            return 'unavailable';
        }

        return 'unscanned';
    }

    private function toLegacyJson(mixed $value): ?string
    {
        $normalized = is_string($value) ? $value : 'unscanned';

        return match ($normalized) {
            'clean' => json_encode([
                'status' => 'completed',
                'malicious' => 0,
                'suspicious' => 0,
            ]),
            'malicious' => json_encode([
                'status' => 'completed',
                'malicious' => 1,
                'suspicious' => 0,
            ]),
            'unavailable' => json_encode([
                'status' => 'unavailable',
                'malicious' => 0,
                'suspicious' => 0,
            ]),
            'pending' => json_encode([
                'status' => 'pending',
                'malicious' => 0,
                'suspicious' => 0,
            ]),
            default => null,
        };
    }
};
