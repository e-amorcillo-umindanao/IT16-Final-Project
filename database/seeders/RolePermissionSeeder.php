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
            'manage_ip_rules',
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
        $userRole = Role::firstOrCreate(['name' => 'user']);

        if (app()->environment(['local', 'staging'])) {
            // 3. Create Default Super Admin Account
            $adminUser = User::updateOrCreate(
                ['email' => env('DEMO_SUPERADMIN_EMAIL', 'admin@securevault.test')],
                [
                    'name' => 'Super Admin',
                    'password' => Hash::make(env('DEMO_SUPERADMIN_PASSWORD', 'Admin@1234!')),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );

            $adminUser->syncRoles([$superAdminRole]);

            // 4. Create Default Admin Account
            $standardAdmin = User::updateOrCreate(
                ['email' => env('DEMO_ADMIN_EMAIL', 'admin.user@securevault.test')],
                [
                    'name' => 'Admin User',
                    'password' => Hash::make(env('DEMO_ADMIN_PASSWORD', 'Admin@1234!')),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );

            $standardAdmin->syncRoles([$adminRole]);

            // 5. Create Default User Account
            $standardUser = User::updateOrCreate(
                ['email' => env('DEMO_USER_EMAIL', 'jd@gmail.com')],
                [
                    'name' => 'John Doe',
                    'password' => Hash::make(env('DEMO_USER_PASSWORD', 'User@1234!')),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );

            $standardUser->syncRoles([$userRole]);
        }
    }
}
