<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Document;
use App\Services\AuditService;
use App\Services\EncryptionService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\VirusTotalService;

class DocumentController extends Controller
{
    use AuthorizesRequests;

    protected $encryptionService;
    protected $auditService;

    public function __construct(EncryptionService $encryptionService, AuditService $auditService)
    {
        $this->encryptionService = $encryptionService;
        $this->auditService = $auditService;
    }

    /**
     * Display a listing of the documents.
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();

        return Inertia::render('Documents/Index', [
            'documents' => $user->documents()
                ->whereNull('deleted_at')
                ->orderByDesc('is_starred')
                ->orderByDesc('created_at')
                ->paginate(15)
                ->through(fn ($doc) => [
                    'id' => $doc->id,
                    'original_name' => $doc->original_name,
                    'mime_type' => $doc->mime_type,
                    'file_size' => $doc->file_size,
                    'is_starred' => (bool) $doc->is_starred,
                    'created_at' => $doc->created_at,
                ]),
        ]);
    }

    /**
     * Show the form for creating a new document.
     */
    public function create(): Response
    {
        return Inertia::render('Documents/Create', [
            'maxSize' => config('securevault.max_upload_size'),
            'allowedMimes' => config('securevault.allowed_mimes'),
            'isFirstDocument' => Auth::user()
                ->documents()
                ->whereNull('deleted_at')
                ->count() === 0,
        ]);
    }

    /**
     * Store a newly created document in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'document' => [
                'required',
                'file',
                'max:' . (config('securevault.max_upload_size') / 1024),
                'mimetypes:' . implode(',', config('securevault.allowed_mimes')),
            ],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $file = $request->file('document');

        // VirusTotal Scan
        $scan = app(VirusTotalService::class)->scan($file);
        if ($scan['malicious'] > 0 || $scan['suspicious'] > 0) {
            $this->auditService->log('document_scan_blocked', null, [
                'filename'  => $file->getClientOriginalName(),
                'malicious' => $scan['malicious'],
                'suspicious'=> $scan['suspicious'],
            ]);
            return back()->withErrors([
                'document' => "Upload blocked: VirusTotal flagged this file ({$scan['malicious']} malicious, {$scan['suspicious']} suspicious detections).",
            ]);
        }
        
        // Encrypt content
        $encryptedData = $this->encryptionService->encryptFile($file->getRealPath());
        
        $encryptedName = Str::uuid()->toString() . '.enc';
        $vaultPath = config('securevault.vault_path');
        
        if (!File::exists($vaultPath)) {
            File::makeDirectory($vaultPath, 0755, true);
        }

        File::put($vaultPath . '/' . $encryptedName, $encryptedData['encrypted_content']);

        $document = Document::create([
            'user_id' => Auth::id(),
            'original_name' => $file->getClientOriginalName(),
            'encrypted_name' => $encryptedName,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'file_hash' => $encryptedData['original_hash'],
            'encryption_iv' => $encryptedData['iv'],
            'description' => $request->description,
            'scan_result' => $scan['status'] === 'completed' ? $scan : null,
        ]);

        $this->auditService->log('document_uploaded', $document);

        return redirect()->route('documents.index')->with('success', 'Document uploaded and encrypted successfully.');
    }

    /**
     * Display the specified document.
     */
    public function show(Document $document): Response
    {
        $this->authorize('view', $document);

        $document->load('user:id,name');

        $auditTrail = AuditLog::where('auditable_type', Document::class)
            ->where('auditable_id', $document->id)
            ->with('user')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(fn ($log) => [
                'action' => $log->action,
                'created_at' => $log->created_at,
                'user' => $log->user ? [
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                    'avatar_url' => $log->user->avatar_url,
                ] : null,
            ]);

        $shares = $document->shares()
            ->with('sharedWith')
            ->active()
            ->get()
            ->map(fn ($share) => [
                'id' => $share->id,
                'permission' => $share->permission,
                'expires_at' => $share->expires_at,
                'user' => [
                    'name' => $share->sharedWith->name,
                    'email' => $share->sharedWith->email,
                    'avatar_url' => $share->sharedWith->avatar_url,
                ],
            ]);

        return Inertia::render('Documents/Show', [
            'document' => [
                'id' => $document->id,
                'original_name' => $document->original_name,
                'mime_type' => $document->mime_type,
                'file_size' => $document->file_size,
                'file_hash' => $document->file_hash,
                'description' => $document->description,
                'created_at' => $document->created_at,
                'user_id' => $document->user_id,
                'is_starred' => (bool) $document->is_starred,
                'owner_name' => $document->user->name,
                'owner_avatar_url' => $document->user->avatar_url,
                'scan_result' => $document->scan_result,
            ],
            'auditTrail' => $auditTrail,
            'shares' => $shares,
            'userPermission' => $this->getUserPermission($document),
        ]);
    }

    /**
     * Download the specified document.
     */
    public function download(Document $document)
    {
        $this->authorize('download', $document);

        $filePath = config('securevault.vault_path') . '/' . $document->encrypted_name;

        if (!File::exists($filePath)) {
            abort(404, 'File not found in vault.');
        }

        $encryptedContent = File::get($filePath);
        
        try {
            $decryptedContent = $this->encryptionService->decryptFile(
                $encryptedContent,
                $document->encryption_iv
            );

            // Verify integrity
            if (!$this->encryptionService->verifyIntegrity($decryptedContent, $document->file_hash)) {
                $this->auditService->log('integrity_violation', $document, [
                    'ip' => request()->ip(),
                    'reason' => 'Hash mismatch detected during download'
                ]);
                abort(500, 'File integrity check failed.');
            }

            $this->auditService->log('document_downloaded', $document);

            return response()->streamDownload(function () use ($decryptedContent) {
                echo $decryptedContent;
            }, $document->original_name, [
                'Content-Type' => $document->mime_type,
            ]);

        } catch (\Exception $e) {
            Log::error('Document decryption failed', [
                'document_id' => $document->id,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
            ]);

            $this->auditService->log('integrity_violation', $document, [
                'reason' => 'decryption_exception',
            ]);

            abort(500, 'Document download failed. Please contact your administrator.');
        }
    }

    public function bulkDownload(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:20'],
            'ids.*' => ['integer', 'exists:documents,id'],
        ]);

        $documents = Document::query()
            ->where('user_id', Auth::id())
            ->whereIn('id', $validated['ids'])
            ->get();

        if ($documents->isEmpty()) {
            return response()->json([
                'error' => 'No documents found.',
            ], 404);
        }

        $tempDirectory = storage_path('app/temp');
        $zipPath = $tempDirectory . '/bulk_' . uniqid('', true) . '.zip';

        if (!File::exists($tempDirectory)) {
            File::makeDirectory($tempDirectory, 0755, true);
        }

        $zip = new \ZipArchive();

        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) !== true) {
            return response()->json([
                'error' => 'Could not create ZIP.',
            ], 500);
        }

        foreach ($documents as $document) {
            try {
                $encryptedPath = config('securevault.vault_path') . '/' . $document->encrypted_name;

                if (!File::exists($encryptedPath)) {
                    Log::warning('Bulk download skipped missing vault file.', [
                        'document_id' => $document->id,
                    ]);

                    continue;
                }

                $decryptedContent = $this->encryptionService->decryptFile(
                    File::get($encryptedPath),
                    $document->encryption_iv
                );

                if (!$this->encryptionService->verifyIntegrity($decryptedContent, $document->file_hash)) {
                    Log::warning('Integrity check failed during bulk download.', [
                        'document_id' => $document->id,
                    ]);

                    continue;
                }

                $zip->addFromString($document->original_name, $decryptedContent);

                $this->auditService->log('document_downloaded', $document, [
                    'document_name' => $document->original_name,
                    'method' => 'bulk_download',
                ]);
            } catch (\Throwable $exception) {
                Log::error('Bulk download failed for document.', [
                    'document_id' => $document->id,
                    'user_id' => Auth::id(),
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        $zip->close();

        $this->auditService->log('bulk_download', null, [
            'document_count' => $documents->count(),
        ]);

        return response()->download($zipPath, 'securevault-documents.zip')->deleteFileAfterSend(true);
    }

    public function bulkDelete(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:50'],
            'ids.*' => ['integer', 'exists:documents,id'],
        ]);

        $count = Document::query()
            ->where('user_id', Auth::id())
            ->whereIn('id', $validated['ids'])
            ->update([
                'deleted_at' => now(),
            ]);

        $this->auditService->log('bulk_delete', null, [
            'document_count' => $count,
        ]);

        return back()->with('success', "{$count} document(s) moved to trash.");
    }

    public function toggleStar(Document $document): RedirectResponse
    {
        abort_unless($document->user_id === Auth::id(), 403);

        $document->update([
            'is_starred' => !$document->is_starred,
        ]);

        $this->auditService->log($document->is_starred ? 'document_starred' : 'document_unstarred', $document, [
            'document_name' => $document->original_name,
        ]);

        return back()->with('success', $document->is_starred ? 'Document starred.' : 'Document unstarred.');
    }

    public function generateShareLink(Request $request, Document $document): JsonResponse
    {
        $this->authorize('update', $document);

        $validated = $request->validate([
            'expires_hours' => ['required', 'integer', 'min:1', 'max:168'],
        ]);

        $url = URL::temporarySignedRoute(
            'documents.access-link',
            now()->addHours($validated['expires_hours']),
            ['document' => $document->id]
        );

        $this->auditService->log('share_link_generated', $document, [
            'document_name' => $document->original_name,
            'expires_hours' => $validated['expires_hours'],
        ]);

        return response()->json([
            'url' => $url,
        ]);
    }

    public function accessViaLink(Request $request, Document $document): Response
    {
        $this->auditService->log('share_link_accessed', $document, [
            'document_name' => $document->original_name,
            'signed_url_expires_at' => $request->query('expires'),
        ]);

        return Inertia::render('Shared/Access', [
            'document' => [
                'id' => $document->id,
                'original_name' => $document->original_name,
                'mime_type' => $document->mime_type,
                'file_size' => $document->file_size,
                'description' => $document->description,
                'created_at' => $document->created_at,
                'owner_name' => $document->user()->value('name'),
            ],
            'expiresAt' => $request->query('expires')
                ? now()->setTimestamp((int) $request->query('expires'))->toIso8601String()
                : null,
        ]);
    }

    /**
     * Remove the specified document from storage (soft delete).
     */
    public function destroy(Document $document): RedirectResponse
    {
        $this->authorize('delete', $document);

        $document->delete();

        $this->auditService->log('document_deleted', $document);

        return redirect()->route('documents.index')->with('success', 'Document moved to trash.');
    }

    /**
     * Display a listing of trashed documents.
     */
    public function trash(Request $request): Response
    {
        $user = Auth::user();

        return Inertia::render('Trash/Index', [
            'documents' => $user->documents()
                ->onlyTrashed()
                ->orderByDesc('deleted_at')
                ->get(['id', 'original_name', 'mime_type', 'file_size', 'deleted_at']),
        ]);
    }

    /**
     * Restore the specified trashed document.
     */
    public function restore(int $id): RedirectResponse
    {
        $user = Auth::user();
        $document = $user->documents()->onlyTrashed()->findOrFail($id);

        $document->restore();

        $this->auditService->log('document_restored', $document);

        return back()->with('success', 'Document restored to My Vault.');
    }

    public function restoreSelected(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
        ]);

        $user = Auth::user();
        $documents = $user->documents()
            ->onlyTrashed()
            ->whereIn('id', $request->ids)
            ->get();

        foreach ($documents as $document) {
            $document->restore();
            $this->auditService->log('document_restored', $document);
        }

        $count = $documents->count();

        return back()->with('success', $count === 1 ? 'Document restored to My Vault.' : "{$count} documents restored to My Vault.");
    }

    /**
     * Permanently delete the specified document from storage.
     */
    public function forceDelete(int $id): RedirectResponse
    {
        $user = Auth::user();
        $document = $user->documents()->onlyTrashed()->findOrFail($id);

        $this->deleteEncryptedFile($document);

        $document->forceDelete();

        $this->auditService->log('document_permanently_deleted', null, [
            'original_name' => $document->original_name,
            'document_id' => $document->id
        ]);

        return back()->with('success', 'Document permanently deleted.');
    }

    public function emptyTrash(): RedirectResponse
    {
        $user = Auth::user();
        $documents = $user->documents()->onlyTrashed()->get();

        foreach ($documents as $document) {
            $this->deleteEncryptedFile($document);
            $document->forceDelete();
        }

        $this->auditService->log('trash_emptied', null, [
            'count' => $documents->count(),
        ]);

        return back()->with('success', 'Trash emptied successfully.');
    }

    private function deleteEncryptedFile(Document $document): void
    {
        $filePath = config('securevault.vault_path') . '/' . $document->encrypted_name;

        if (File::exists($filePath)) {
            File::delete($filePath);
        }
    }

    private function getUserPermission(Document $document): string
    {
        if (Auth::id() === $document->user_id) {
            return 'owner';
        }

        if (Auth::user()?->can('view_all_documents')) {
            return 'admin_viewer';
        }

        $share = $document->shares()
            ->where('shared_with_id', Auth::id())
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();

        return $share?->permission ?? 'none';
    }
}
