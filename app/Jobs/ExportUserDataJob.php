<?php

namespace App\Jobs;

use App\Mail\DataExportReadyMail;
use App\Models\AuditLog;
use App\Models\DataExport;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use RuntimeException;
use ZipArchive;

class ExportUserDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        private readonly User $user,
        private readonly DataExport $export,
    ) {}

    public function handle(): void
    {
        $exportDirectory = storage_path('app/exports');
        File::ensureDirectoryExists($exportDirectory);

        $zipFilename = "export_{$this->export->token}.zip";
        $zipPath = $exportDirectory.DIRECTORY_SEPARATOR.$zipFilename;

        $zip = new ZipArchive();
        $result = $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        if ($result !== true) {
            throw new RuntimeException('Unable to create export archive.');
        }

        $zip->addFromString('profile.json', json_encode([
            'name' => $this->user->name,
            'email' => $this->user->email,
            'created_at' => $this->user->created_at,
            'last_login_at' => $this->user->last_login_at,
            'two_factor_enabled' => (bool) $this->user->two_factor_enabled,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        $documents = $this->user->documents()
            ->withTrashed()
            ->get([
                'id',
                'original_name',
                'mime_type',
                'file_size',
                'scan_result',
                'is_starred',
                'created_at',
                'deleted_at',
            ])
            ->toArray();

        $zip->addFromString(
            'documents.json',
            json_encode($documents, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        );

        $activity = AuditLog::query()
            ->where('user_id', $this->user->id)
            ->orderBy('created_at')
            ->get(['action', 'category', 'ip_address', 'metadata', 'created_at'])
            ->map(fn (AuditLog $log) => [
                'action' => $log->action,
                'category' => $log->category,
                'ip_address' => $log->ip_address,
                'metadata' => $log->metadata,
                'timestamp' => $log->created_at,
            ])
            ->toArray();

        $zip->addFromString(
            'activity.json',
            json_encode($activity, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES),
        );

        $zip->close();

        $this->export->update([
            'file_path' => "exports/{$zipFilename}",
            'status' => 'ready',
        ]);

        Mail::to($this->user->email)->send(new DataExportReadyMail($this->user, $this->export));
    }

    public function failed(\Throwable $exception): void
    {
        $this->export->update([
            'status' => 'expired',
        ]);

        Log::error('Data export job failed', [
            'user_id' => $this->user->id,
            'export_id' => $this->export->id,
            'error' => $exception->getMessage(),
        ]);
    }
}
