<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Document;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
        ]);

        $query = $validated['q'];
        $user = $request->user();
        $canSearchAllLogs =
            $user?->can('view_admin_dashboard') === true ||
            $user?->can('view_audit_logs') === true;
        $canSearchUsers =
            $user?->can('manage_users') === true ||
            $user?->can('view_audit_logs') === true;
        $canViewAllDocuments = $user?->can('view_all_documents') === true;

        $documentsQuery = Document::query()
            ->whereNull('deleted_at')
            ->where('original_name', 'like', "%{$query}%");

        if (!$canViewAllDocuments) {
            $documentsQuery->where(function ($documentQuery) use ($user) {
                $documentQuery
                    ->where('user_id', $user->id)
                    ->orWhereHas('shares', function ($shareQuery) use ($user) {
                        $shareQuery
                            ->where('shared_with_id', $user->id)
                            ->active();
                    });
            });
        }

        $documents = $documentsQuery
            ->orderByDesc('created_at')
            ->limit(5)
            ->get(['id', 'original_name', 'mime_type', 'file_size', 'created_at'])
            ->map(fn (Document $document) => [
                'type' => 'document',
                'id' => $document->id,
                'original_name' => $document->original_name,
                'mime_type' => $document->mime_type,
                'file_size' => $document->file_size,
                'created_at' => $document->created_at?->toIso8601String(),
            ])
            ->values();

        $logsQuery = AuditLog::query();

        if (!$canSearchAllLogs) {
            $logsQuery->where('user_id', $user->id);
        }

        $logs = $logsQuery
            ->where(function ($logQuery) use ($query) {
                $logQuery
                    ->where('action', 'like', "%{$query}%")
                    ->orWhere('metadata', 'like', "%{$query}%")
                    ->orWhere('metadata->document_name', 'like', "%{$query}%")
                    ->orWhere('metadata->original_name', 'like', "%{$query}%");
            })
            ->orderByDesc('created_at')
            ->limit(3)
            ->get(['id', 'action', 'created_at', 'metadata'])
            ->map(fn (AuditLog $log) => [
                'type' => 'log',
                'id' => $log->id,
                'action' => $log->action,
                'created_at' => $log->created_at?->toIso8601String(),
            ])
            ->values();

        $users = collect();

        if ($canSearchUsers) {
            $users = User::query()
                ->where(function ($userQuery) use ($query) {
                    $userQuery
                        ->where('name', 'like', "%{$query}%")
                        ->orWhere('email', 'like', "%{$query}%");
                })
                ->orderBy('name')
                ->limit(3)
                ->get(['id', 'name', 'email'])
                ->map(fn (User $searchUser) => [
                    'type' => 'user',
                    'id' => $searchUser->id,
                    'name' => $searchUser->name,
                    'email' => $searchUser->email,
                    'avatar_url' => $searchUser->avatar_url,
                ])
                ->values();
        }

        return response()->json([
            'results' => [
                'documents' => $documents,
                'logs' => $logs,
                'users' => $users,
            ],
            'total' => $documents->count() + $logs->count() + $users->count(),
        ]);
    }
}
