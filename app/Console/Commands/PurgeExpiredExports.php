<?php

namespace App\Console\Commands;

use App\Models\DataExport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class PurgeExpiredExports extends Command
{
    protected $signature = 'securevault:purge-expired-exports';

    protected $description = 'Delete expired personal data exports and mark them expired.';

    public function handle(): void
    {
        $expiredExports = DataExport::query()
            ->where('expires_at', '<', now())
            ->whereIn('status', ['ready', 'pending'])
            ->get();

        foreach ($expiredExports as $export) {
            if (is_string($export->file_path) && $export->file_path !== '') {
                $path = storage_path("app/{$export->file_path}");

                if (File::exists($path)) {
                    File::delete($path);
                }
            }

            $export->update([
                'status' => 'expired',
            ]);
        }

        $this->info("Purged {$expiredExports->count()} expired export(s).");
    }
}
