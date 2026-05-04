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
use Illuminate\Support\Facades\Storage;
use Throwable;

class ScanDocumentWithVirusTotal implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;
    public int $timeout = 60;

    public function __construct(
        public readonly int $documentId,
        public readonly string $stagingName,
    ) {
    }

    public function handle(VirusTotalService $virusTotal, AuditService $audit): void
    {
        $document = Document::query()->find($this->documentId);
        $stagingDisk = Storage::disk('scan-staging');

        if (! $document) {
            $stagingDisk->delete($this->stagingName);
            return;
        }

        if (! $stagingDisk->exists($this->stagingName)) {
            $document->update([
                'scan_result' => 'unavailable',
            ]);

            Log::warning('VirusTotal scan staging file missing.', [
                'document_id' => $document->id,
            ]);

            return;
        }

        $scanPath = $stagingDisk->path($this->stagingName);

        try {
            $result = $virusTotal->scan($scanPath);

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
        } catch (Throwable $exception) {
            $document->update([
                'scan_result' => 'unavailable',
            ]);

            Log::error('VirusTotal scan failed.', [
                'document_id' => $document->id,
                'error' => $exception->getMessage(),
            ]);
        } finally {
            $stagingDisk->delete($this->stagingName);
        }
    }

    public function failed(\Throwable $exception): void
    {
        Storage::disk('scan-staging')->delete($this->stagingName);

        $document = Document::withTrashed()->find($this->documentId);

        if ($document) {
            $document->updateQuietly([
                'scan_result' => 'unavailable',
            ]);
        }

        Log::error('ScanDocumentWithVirusTotal job permanently failed.', [
            'document_id' => $this->documentId,
            'message' => $exception->getMessage(),
        ]);
    }
}
