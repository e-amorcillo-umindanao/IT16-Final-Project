<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\DataExport;
use App\Models\DocumentShare;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PurgeScheduledDeletions extends Command
{
    protected $signature = 'securevault:purge-deletions';

    protected $description = 'Permanently purge accounts that have reached the end of the deletion grace period.';

    public function __construct(private readonly AuditService $auditService)
    {
        parent::__construct();
    }

    public function handle(): void
    {
        $users = User::query()
            ->whereNotNull('deletion_scheduled_for')
            ->where('deletion_scheduled_for', '<=', now())
            ->get();

        foreach ($users as $user) {
            $this->purgeUser($user);
        }

        $this->info("Purged {$users->count()} scheduled account(s).");
    }

    private function purgeUser(User $user): void
    {
        if (is_string($user->avatar_path) && $user->avatar_path !== '') {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $documents = $user->documents()->withTrashed()->with('versions')->get();

        foreach ($documents as $document) {
            $currentFilePath = config('securevault.vault_path').DIRECTORY_SEPARATOR.$document->encrypted_name;

            if (File::exists($currentFilePath)) {
                File::delete($currentFilePath);
            }

            foreach ($document->versions as $version) {
                $versionPath = config('securevault.vault_path').DIRECTORY_SEPARATOR.$version->encrypted_name;

                if (File::exists($versionPath)) {
                    File::delete($versionPath);
                }
            }

            $document->forceDelete();
        }

        DocumentShare::query()
            ->where('shared_by_id', $user->id)
            ->orWhere('shared_with_id', $user->id)
            ->delete();

        DataExport::query()
            ->where('user_id', $user->id)
            ->get()
            ->each(function (DataExport $export): void {
                if (is_string($export->file_path) && $export->file_path !== '') {
                    $path = storage_path("app/{$export->file_path}");

                    if (File::exists($path)) {
                        File::delete($path);
                    }
                }

                $export->delete();
            });

        $user->twoFactorRecoveryCodes()->delete();
        DB::table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->delete();

        $user->syncRoles([]);
        $user->syncPermissions([]);

        AuditLog::query()
            ->where('user_id', $user->id)
            ->update(['user_id' => null]);

        $this->auditService->logSystem('account_deletion_executed', metadata: [
            'anonymised_email' => substr($user->email, 0, 3).'***',
        ]);

        $user->update([
            'name' => '[Deleted User]',
            'email' => 'deleted-user-'.$user->id.'@securevault.invalid',
            'password' => Hash::make(Str::random(40)),
            'avatar_path' => null,
            'email_verified_at' => null,
            'two_factor_secret' => null,
            'two_factor_enabled' => false,
            'remember_token' => null,
            'is_active' => false,
            'last_login_at' => null,
            'last_login_ip' => null,
            'last_login_location' => null,
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'deletion_requested_at' => null,
            'deletion_scheduled_for' => null,
            'deletion_cancel_token' => null,
        ]);
    }
}
