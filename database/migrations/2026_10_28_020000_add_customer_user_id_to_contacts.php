<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('contacts', function (Blueprint $table): void {
            // Links a lead/contact to the registered customer account that
            // submitted it (audit, project request, or demo booking). The
            // owning business account remains in `user_id`.
            $table->foreignId('customer_user_id')->nullable()
                ->constrained('users')
                ->nullOnDelete()
                ->after('user_id');

            $table->index('customer_user_id', 'contacts_customer_user_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('contacts', function (Blueprint $table): void {
            $table->dropIndex('contacts_customer_user_index');
            $table->dropForeign(['customer_user_id']);
            $table->dropColumn('customer_user_id');
        });
    }
};
