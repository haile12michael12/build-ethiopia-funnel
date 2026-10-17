<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('funnels', function (Blueprint $table) {
            $table->json('step_branches')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('funnels', function (Blueprint $table) {
            $table->dropColumn('step_branches');
        });
    }
};
