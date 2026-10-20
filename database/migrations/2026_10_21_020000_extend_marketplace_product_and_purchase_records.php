<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketplace_templates', function (Blueprint $table) {
            $table->string('category', 80)->default('other');
            $table->text('license_terms')->nullable();
            $table->text('documentation_url')->nullable();
            $table->text('demo_url')->nullable();
            $table->json('compatibility')->nullable();
            $table->text('support_information')->nullable();
            $table->index(['status', 'category', 'type']);
        });

        Schema::table('marketplace_purchases', function (Blueprint $table) {
            $table->string('license_snapshot', 100)->nullable();
            $table->text('license_terms_snapshot')->nullable();
            $table->timestamp('license_accepted_at')->nullable();
            $table->unsignedBigInteger('contributor_share_amount_minor')->nullable();
            $table->unsignedBigInteger('platform_commission_amount_minor')->nullable();
            $table->index(['buyer_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('marketplace_purchases', function (Blueprint $table) {
            $table->dropIndex(['buyer_id', 'created_at']);
            $table->dropColumn([
                'license_snapshot',
                'license_terms_snapshot',
                'license_accepted_at',
                'contributor_share_amount_minor',
                'platform_commission_amount_minor',
            ]);
        });

        Schema::table('marketplace_templates', function (Blueprint $table) {
            $table->dropIndex(['status', 'category', 'type']);
            $table->dropColumn([
                'category',
                'license_terms',
                'documentation_url',
                'demo_url',
                'compatibility',
                'support_information',
            ]);
        });
    }
};
