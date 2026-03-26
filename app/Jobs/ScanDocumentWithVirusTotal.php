<?php

namespace App\Jobs;

use App\Models\Document;
use App\Services\AuditService;
use App\Services\VirusTotalService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ScanDocumentWithVirusTotal implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;

    public function __construct(
        private readonly Document $document,
    ) {
    }

    public function handle(VirusTotalService $virusTotal, AuditService $audit): void
    {
        $document = Document::query()->find($this->document->id);

        if (!$document) {
            return;
        }

        $filePath = config('securevault.vault_path').DIRECTORY_SEPARATOR.$document->encrypted_name;
        $result = $virusTotal->scan($filePath);

        $document->update([
            'scan_result' => $result,
        ]);

        if ($result !== 'malicious') {
            return;
        }

        $audit->log('malware_detected', $document, [
            'document_name' => $document->original_name,
            'scan_result' => $result,
            'detected_at' => 'async_queue',
        ]);

        $document->delete();

        Log::warning('Malicious file detected post-upload and removed.', [
            'document_id' => $document->id,
            'user_id' => $document->user_id,
        ]);
    }

    public function failed(\Throwable $exception): void
    {
        $document = Document::withTrashed()->find($this->document->id);

        if ($document) {
            $document->updateQuietly([
                'scan_result' => 'unavailable',
            ]);
        }

        Log::error('ScanDocumentWithVirusTotal job permanently failed.', [
            'document_id' => $this->document->id,
            'message' => $exception->getMessage(),
        ]);
    }
}
