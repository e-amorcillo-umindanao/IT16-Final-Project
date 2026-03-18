<?php

namespace App\Console\Commands;

use App\Models\Document;
use App\Services\AuditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class PurgeExpiredTrash extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'vault:purge-trash';

    /**
     * The message that will be logged for each purged document.
     */
    protected $description = 'Permanently deletes trashed documents older than the retention period.';

    /**
     * Execute the console command.
     */
    public function handle(AuditService $auditService): void
    {
        $retentionDays = config('securevault.trash_retention_days', 30);
        $expiryDate = now()->subDays($retentionDays);

        $expiredDocuments = Document::onlyTrashed()
            ->where('deleted_at', '<', $expiryDate)
            ->get();

        if ($expiredDocuments->isEmpty()) {
            $this->info('No expired trashed documents found to purge.');
            return;
        }

        $this->info("Found {$expiredDocuments->count()} expired documents. Starting purge...");

        $count = 0;
        foreach ($expiredDocuments as $document) {
            // 1. Delete encrypted file from disk
            $filePath = config('securevault.vault_path') . '/' . $document->encrypted_name;
            if (File::exists($filePath)) {
                File::delete($filePath);
            }

            // 2. Audit log the auto-purge
            $auditService->log('auto_purged', null, [
                'original_name' => $document->original_name,
                'document_id' => $document->id,
                'reason' => "Retention period of {$retentionDays} days exceeded",
            ]);

            // 3. Force delete from DB
            $document->forceDelete();
            
            $count++;
            $this->line("Purged: {$document->original_name}");
        }

        $this->info("Successfully purged {$count} documents.");
    }
}
