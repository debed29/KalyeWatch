<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.gv
     */
    public function up(): void
    {

Schema::create('incidents', function (Blueprint $table) {
    $table->id();

    // User who submitted the incident
    $table->foreignId('user_id')
        ->constrained('users')
        ->restrictOnDelete();

    // Incident information
    $table->string('category', 60);
    $table->date('incident_date');
    $table->time('incident_time')->nullable();
    $table->text('description');
    $table->string('location_description');

    // Exact coordinates: do not expose these directly on the public map
    $table->decimal('latitude', 10, 7)->nullable();
    $table->decimal('longitude', 10, 7)->nullable();

    // Set these on the server, not from user-submitted form values
    $table->string('source_type', 30)->default('community_user');
    $table->string('status', 30)->default('pending');
    $table->string('severity', 20)->nullable();

    // Administrative review
    $table->foreignId('reviewed_by')
        ->nullable()
        ->constrained('users')
        ->nullOnDelete();

    $table->text('rejection_reason')->nullable();
    $table->timestamp('reviewed_at')->nullable();
    $table->timestamp('verified_at')->nullable();

    $table->timestamps();

    $table->index(['status', 'created_at']);
    $table->index(['category', 'incident_date']);
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incidents');
    }
};
