<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_acquisition_settings', function (Blueprint $table): void {
            $table->boolean('appointment_enabled')->default(true);
            $table->string('appointment_timezone', 64)->nullable();
            $table->unsignedSmallInteger('appointment_slot_minutes')->nullable();
            $table->unsignedSmallInteger('appointment_buffer_minutes')->nullable();
            $table->unsignedSmallInteger('appointment_advance_days')->nullable();
            $table->unsignedSmallInteger('appointment_max_per_day')->nullable();
            $table->json('appointment_business_hours')->nullable();
            $table->json('appointment_meeting_types')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('client_acquisition_settings', function (Blueprint $table): void {
            $table->dropColumn([
                'appointment_enabled',
                'appointment_timezone',
                'appointment_slot_minutes',
                'appointment_buffer_minutes',
                'appointment_advance_days',
                'appointment_max_per_day',
                'appointment_business_hours',
                'appointment_meeting_types',
            ]);
        });
    }
};
