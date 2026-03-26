<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->enum('category', ['security', 'audit'])
                ->default('audit')
                ->after('action');

            $table->index('category');
        });

        DB::table('audit_logs')
            ->whereIn('action', [
                'login_success',
                'login_failed',
                'login_blocked_inactive',
                'account_locked',
                'logout',
                '2fa_enabled',
                '2fa_disabled',
                '2fa_verified',
                '2fa_failed',
                '2fa_corrupt_reset',
                'document_scan_blocked',
                'malware_detected',
                'integrity_violation',
                'session_revoked',
                'session_terminated',
                'all_sessions_terminated',
                'password_changed',
                'pwned_password_rejected',
                'signed_url_generated',
                'signed_url_accessed',
            ])
            ->update(['category' => 'security']);
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('audit_logs_category_index');
            $table->dropColumn('category');
        });
    }
};
