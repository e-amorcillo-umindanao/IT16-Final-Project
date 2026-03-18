<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Create Permissions
        $permissions = [
            'view_admin_dashboard',
            'manage_users',
            'view_audit_logs',
            'manage_sessions',
            'view_all_documents',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // 2. Create Roles and Assign Permissions
        
        // Super Admin
        $superAdminRole = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdminRole->givePermissionTo(Permission::all());

        // Admin
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $adminRole->givePermissionTo([
            'view_admin_dashboard',
            'view_audit_logs',
            'manage_sessions',
        ]);

        // User
        Role::firstOrCreate(['name' => 'user']);

        // 3. Create Default Super Admin Account
        $adminUser = User::updateOrCreate(
            ['email' => 'admin@securevault.test'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('SecureVault@2026'),
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        $adminUser->assignRole($superAdminRole);
    }
}
