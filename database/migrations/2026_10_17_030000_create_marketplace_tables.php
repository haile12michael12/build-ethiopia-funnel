<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketplace_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('slug')->unique();
            $table->string('type', 20)->default('template');
            $table->string('name');
            $table->text('description');
            $table->json('preview_images')->nullable();
            $table->json('tech_stack')->nullable();
            $table->unsignedBigInteger('amount_minor')->nullable();
            $table->char('currency', 3)->default('ETB');
            $table->json('included_modules')->nullable();
            $table->string('version', 50)->default('1.0.0');
            $table->text('changelog')->nullable();
            $table->string('license', 100)->default('Personal use');
            $table->string('file_path')->nullable();
            $table->string('status', 30)->default('pending_review');
            $table->decimal('contributor_revenue_share_percent', 5, 2)->default(70);
            $table->timestamps();

            $table->index(['status', 'type']);
            $table->index(['owner_id', 'status']);
        });

        Schema::create('marketplace_template_items', function (Blueprint $table) {
            $table->foreignId('bundle_id')->constrained('marketplace_templates')->cascadeOnDelete();
            $table->foreignId('template_id')->constrained('marketplace_templates')->cascadeOnDelete();
            $table->primary(['bundle_id', 'template_id']);
        });

        Schema::create('marketplace_purchases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('template_id')->constrained('marketplace_templates')->restrictOnDelete();
            $table->string('provider', 30)->default('chapa');
            $table->string('tx_ref', 100)->unique();
            $table->string('provider_transaction_id', 100)->nullable()->unique();
            $table->unsignedBigInteger('amount_minor');
            $table->char('currency', 3);
            $table->string('status', 20)->default('pending');
            $table->text('checkout_url')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->json('provider_metadata')->nullable();
            $table->timestamps();

            $table->index(['buyer_id', 'status']);
            $table->index(['template_id', 'status']);
        });

        Schema::create('marketplace_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider_event_key', 64)->unique();
            $table->string('tx_ref', 100)->nullable()->index();
            $table->string('status', 20)->default('received');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketplace_webhook_events');
        Schema::dropIfExists('marketplace_purchases');
        Schema::dropIfExists('marketplace_template_items');
        Schema::dropIfExists('marketplace_templates');
    }
};
