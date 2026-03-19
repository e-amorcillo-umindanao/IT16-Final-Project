<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\Document;
use App\Models\DocumentShare;
use App\Models\AuditLog;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    /**
     * Display the user dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        // 1. My Documents Count
        $myDocumentsCount = Document::where('user_id', $user->id)->count();

        // 2. Shared with Me Count
        $sharedWithMeCount = DocumentShare::where('shared_with_id', $user->id)
            ->whereHas('document')
            ->count();

        // 3. Storage Used (Sum of file sizes in bytes)
        $storageUsedBytes = Document::where('user_id', $user->id)->sum('file_size');
        
        // Format storage
        $storageUsed = $this->formatBytes($storageUsedBytes);

        // 4. Recent Activity (Last 10 logs for this user)
        $recentActivity = AuditLog::with('auditable')
            ->where('user_id', $user->id)
            ->latest()
            ->take(10)
            ->get()
            ->map(function (AuditLog $log) {
                $documentName = $log->auditable instanceof Document
                    ? $log->auditable->original_name
                    : ($log->metadata['original_name'] ?? null);

                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'description' => $this->formatActivityDescription($log->action, $documentName),
                    'created_at' => $log->created_at,
                ];
            });

        return Inertia::render('Dashboard', [
            'stats' => [
                'myDocuments' => $myDocumentsCount,
                'sharedWithMe' => $sharedWithMeCount,
                'storageUsed' => $storageUsed,
            ],
            'recentActivity' => $recentActivity,
            'displayName' => Str::ucfirst($user->name),
        ]);
    }

    /**
     * Format bytes to humans readable string.
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        if ($bytes === 0) {
            return '0 B';
        }

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));

        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    private function formatActivityDescription(string $action, ?string $documentName = null): string
    {
        $target = $documentName ?? 'a document';

        return match ($action) {
            'document_uploaded' => "You uploaded {$target}",
            'document_downloaded' => "You downloaded {$target}",
            'document_deleted' => "You deleted {$target}",
            'document_restored' => "You restored {$target}",
            'document_shared' => "You shared {$target}",
            'share_revoked' => "You revoked sharing for {$target}",
            'login_success', 'login' => 'You signed in successfully',
            'logout' => 'You signed out',
            default => 'You performed an account action',
        };
    }
}
