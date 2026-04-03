<?php

namespace App\Http\Controllers;

use App\Models\DocumentShare;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the user dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $documentCount = $user->documents()->whereNull('deleted_at')->count();
        $storageUsed = $user->documents()->whereNull('deleted_at')->sum('file_size');
        $sharedWithMe = DocumentShare::query()
            ->where('shared_with_id', $user->id)
            ->active()
            ->whereHas('document')
            ->count();
        $activeSessions = DB::connection(config('session.connection'))
            ->table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->count();
        $failedLogins24h = AuditLog::query()
            ->where('user_id', $user->id)
            ->where('action', 'login_failed')
            ->where('created_at', '>=', now()->subHours(24))
            ->count();
        $averageFileSize = $documentCount > 0
            ? (int) round($storageUsed / $documentCount)
            : 0;

        return Inertia::render('Dashboard', [
            'stats' => [
                'document_count' => $documentCount,
                'shared_with_me' => $sharedWithMe,
                'active_sessions' => $activeSessions,
                'failed_logins_24h' => $failedLogins24h,
                'storage_used' => $storageUsed,
                'total_documents' => $documentCount,
                'average_file_size' => $averageFileSize,
            ],
            'days_until_password_expiry' => config('securevault.password_expiry_days') === 0
                ? null
                : $user->daysUntilPasswordExpiry(),
            'recent_documents' => $user->documents()
                ->whereNull('deleted_at')
                ->orderByDesc('created_at')
                ->limit(5)
                ->get(['id', 'original_name', 'mime_type', 'file_size', 'created_at']),
            'recent_activity' => AuditLog::query()
                ->where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->limit(8)
                ->get(['action', 'metadata', 'created_at', 'ip_address']),
        ]);
    }
}
