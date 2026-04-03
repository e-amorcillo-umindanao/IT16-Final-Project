<?php

namespace App\Http\Controllers;

use App\Jobs\ExportUserDataJob;
use App\Models\DataExport;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DataExportController extends Controller
{
    public function __construct(private readonly AuditService $auditService) {}

    public function request(): RedirectResponse
    {
        $user = request()->user();

        $recentExports = DataExport::query()
            ->where('user_id', $user->id)
            ->where('created_at', '>=', now()->subDay())
            ->whereIn('status', ['pending', 'ready'])
            ->latest()
            ->get();

        $blockingExport = $recentExports->first(function (DataExport $export): bool {
            if ($export->status === 'pending') {
                return true;
            }

            if ($export->isDownloadReady()) {
                return true;
            }

            $export->update([
                'status' => 'expired',
            ]);

            return false;
        });

        if ($blockingExport) {
            return back()->withErrors([
                'export' => 'You have already requested an export in the last 24 hours.',
            ]);
        }

        $export = DataExport::query()->create([
            'user_id' => $user->id,
            'token' => Str::random(64),
            'status' => 'pending',
            'expires_at' => now()->addHours(24),
        ]);

        ExportUserDataJob::dispatch($user, $export);

        $this->auditService->log('data_export_requested', metadata: [
            'export_id' => $export->id,
        ]);

        return back()->with('status', 'export-requested');
    }

    public function download(string $token): BinaryFileResponse
    {
        $export = DataExport::query()
            ->where('token', $token)
            ->where('status', 'ready')
            ->where('expires_at', '>', now())
            ->firstOrFail();

        $path = storage_path("app/{$export->file_path}");

        if (! File::exists($path)) {
            $export->update([
                'status' => 'expired',
            ]);

            abort(404, 'Export file not found.');
        }

        $export->update([
            'status' => 'downloaded',
        ]);

        return response()->download($path, 'securevault-export.zip')->deleteFileAfterSend(true);
    }
}
