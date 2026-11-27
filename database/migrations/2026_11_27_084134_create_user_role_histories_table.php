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
        Schema::create('user_role_histories', function (Blueprint $table) {
            $table->id();

            // Account whose role was changed.
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Preserve account details even if the account is deleted.
            $table->string('user_name');
            $table->string('user_email');

            // Administrator who performed the role change.
            $table->foreignId('actor_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            // Preserve administrator details for historical records.
            $table->string('actor_name');
            $table->string('actor_email');

            // Record the role before and after the change.
            $table->string('old_role', 30);
            $table->string('new_role', 30);

            // Optional explanation for the role change.
            $table->text('reason')->nullable();

            // Audit entries are historical records, not editable records.
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'created_at']);
            $table->index(['actor_user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_role_histories');
    }
};
