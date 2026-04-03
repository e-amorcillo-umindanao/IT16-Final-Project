<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    public function up(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permission = Permission::firstOrCreate(['name' => 'manage_ip_rules']);
        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);

        if (! $superAdmin->hasPermissionTo($permission)) {
            $superAdmin->givePermissionTo($permission);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $superAdmin = Role::where('name', 'super-admin')->first();
        $permission = Permission::where('name', 'manage_ip_rules')->first();

        if ($superAdmin && $permission && $superAdmin->hasPermissionTo($permission)) {
            $superAdmin->revokePermissionTo($permission);
        }

        $permission?->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
