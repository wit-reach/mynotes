<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Check if we need to rename the old Node.js column
            if (Schema::hasColumn('users', 'password_hash') && !Schema::hasColumn('users', 'password')) {
                $table->renameColumn('password_hash', 'password');
            }

            // If neither exists (weird case), add password
            if (!Schema::hasColumn('users', 'password_hash') && !Schema::hasColumn('users', 'password')) {
                $table->string('password');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'password')) {
                $table->renameColumn('password', 'password_hash');
            }
        });
    }
};
