<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('deletion_requested_at')->nullable()->after('is_active');
            $table->timestamp('deletion_scheduled_for')->nullable()->after('deletion_requested_at');
            $table->string('deletion_cancel_token', 64)->nullable()->after('deletion_scheduled_for');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'deletion_requested_at',
                'deletion_scheduled_for',
                'deletion_cancel_token',
            ]);
        });
    }
};
