<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BackupSuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('BACKUP_SUPERADMIN_EMAIL');
        $password = env('BACKUP_SUPERADMIN_PASSWORD');

        if (empty($email) || empty($password)) {
            $this->command?->warn(
                'BACKUP_SUPERADMIN_EMAIL or BACKUP_SUPERADMIN_PASSWORD not set. Backup Super Admin was not created.'
            );

            return;
        }

        if (User::where('email', $email)->exists()) {
            $this->command?->info('Backup Super Admin already exists. Skipping.');

            return;
        }

        $user = User::create([
            'name' => 'System Recovery Account',
            'email' => $email,
            'password' => Hash::make($password),
            'email_verified_at' => now(),
            'is_active' => true,
            'is_system_account' => true,
            'two_factor_enabled' => false,
            'two_factor_deadline' => null,
            'password_changed_at' => now(),
        ]);

        $user->assignRole('super-admin');

        $this->command?->info('Backup Super Admin account created successfully.');
        $this->command?->warn(
            'Store the backup credentials in a secure offline location. This account is hidden from the admin UI.'
        );
    }
}
