<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->json('business_audit')->nullable();
            $table->unsignedTinyInteger('lead_score')->default(0);
            $table->json('lead_score_breakdown')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table) {
            $table->dropColumn(['business_audit', 'lead_score', 'lead_score_breakdown']);
        });
    }
};
