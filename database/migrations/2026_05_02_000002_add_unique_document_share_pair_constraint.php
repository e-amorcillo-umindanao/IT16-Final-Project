<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('document_shares')
            ->select('document_id', 'shared_with_id', DB::raw('MAX(id) as keep_id'))
            ->groupBy('document_id', 'shared_with_id')
            ->havingRaw('COUNT(*) > 1')
            ->get()
            ->each(function (object $duplicate): void {
                DB::table('document_shares')
                    ->where('document_id', $duplicate->document_id)
                    ->where('shared_with_id', $duplicate->shared_with_id)
                    ->where('id', '!=', $duplicate->keep_id)
                    ->delete();
            });

        Schema::table('document_shares', function (Blueprint $table) {
            $table->unique(['document_id', 'shared_with_id'], 'document_shares_document_shared_with_unique');
        });
    }

    public function down(): void
    {
        Schema::table('document_shares', function (Blueprint $table) {
            $table->dropUnique('document_shares_document_shared_with_unique');
        });
    }
};
