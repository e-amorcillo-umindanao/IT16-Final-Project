<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ClearScanStagingFiles extends Command
{
    protected $signature = 'securevault:clear-scan-staging';

    protected $description = 'Delete orphaned plaintext scan-staging files older than one hour.';

    public function handle(): void
    {
        $disk = Storage::disk('scan-staging');
        $cutoff = now()->subHour()->getTimestamp();
        $deletedCount = 0;

        foreach ($disk->allFiles() as $path) {
            if ($disk->lastModified($path) > $cutoff) {
                continue;
            }

            if ($disk->delete($path)) {
                $deletedCount++;
            }
        }

        Log::info('Cleared orphaned scan-staging files.', [
            'deleted_count' => $deletedCount,
        ]);

        $this->info("Cleared {$deletedCount} scan-staging file(s).");
    }
}
