<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ip_rules', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['allowlist', 'blocklist'])->index();
            $table->string('cidr', 50);
            $table->string('label', 255)->nullable();
            $table->foreignId('created_by')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['type', 'cidr']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ip_rules');
    }
};
