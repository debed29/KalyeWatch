
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create a table for photos attached to incident reports.
     */
    public function up(): void
    {
        Schema::create('incident_images', function (Blueprint $table) {
            $table->id();

            // Connect each photo to its incident report.
            $table->foreignId('incident_id')
                ->constrained('incidents')
                ->cascadeOnDelete();

            // Private storage path of the uploaded image.
            $table->string('path');

            // Store image information for validation and display.
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('size_bytes');

            $table->timestamps();

            // Helps retrieve all photos belonging to an incident.
            $table->index('incident_id');
        });
    }

    /**
     * Remove the incident images table when rolling back.
     */
    public function down(): void
    {
        Schema::dropIfExists('incident_images');
    }
};
