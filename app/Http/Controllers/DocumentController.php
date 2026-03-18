<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Document;
use App\Services\AuditService;
use App\Services\EncryptionService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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
        $query = Document::ownedBy(Auth::id())
            ->when($request->search, function ($q, $search) {
                $q->where('original_name', 'like', "%{$search}%");
            });

        return Inertia::render('Documents/Index', [
            'documents' => $query->latest()->paginate(15)->withQueryString(),
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Show the form for creating a new document.
     */
    public function create(): Response
    {
        return Inertia::render('Documents/Upload', [
            'maxSize' => config('securevault.max_upload_size'),
            'allowedMimes' => config('securevault.allowed_mimes'),
        ]);
    }

    /**
     * Store a newly created document in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'max:' . (config('securevault.max_upload_size') / 1024),
                'mimetypes:' . implode(',', config('securevault.allowed_mimes')),
            ],
        ]);

        $file = $request->file('file');
        $originalContent = File::get($file->getRealPath());
        
        // Encrypt content
        $encryptedData = $this->encryptionService->encrypt($originalContent);
        
        $encryptedName = Str::uuid()->toString() . '.enc';
        $vaultPath = config('securevault.vault_path');
        
        if (!File::exists($vaultPath)) {
            File::makeDirectory($vaultPath, 0755, true);
        }

        File::put($vaultPath . '/' . $encryptedName, $encryptedData['content']);

        $document = Document::create([
            'user_id' => Auth::id(),
            'original_name' => $file->getClientOriginalName(),
            'encrypted_name' => $encryptedName,
            'mime_type' => $file->getMimeType(),
            'file_size' => $file->getSize(),
            'file_hash' => $encryptedData['hash'],
            'encryption_iv' => $encryptedData['iv'],
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

        $document->load([
            'shares.sharedWith:id,name,email',
            'user:id,name',
        ]);

        $auditLogs = AuditLog::where('auditable_type', Document::class)
            ->where('auditable_id', $document->id)
            ->with('user:id,name')
            ->latest()
            ->limit(20)
            ->get();

        return Inertia::render('Documents/Show', [
            'document' => $document,
            'auditLogs' => $auditLogs,
            'authUserId' => Auth::id(),
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
            $decryptedContent = $this->encryptionService->decrypt(
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
            abort(500, 'Decryption failed: ' . $e->getMessage());
        }
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
        $documents = Document::onlyTrashed()
            ->ownedBy(Auth::id())
            ->latest()
            ->paginate(15);

        return Inertia::render('Documents/Trash', [
            'documents' => $documents,
        ]);
    }

    /**
     * Restore the specified trashed document.
     */
    public function restore(int $id): RedirectResponse
    {
        $document = Document::onlyTrashed()->findOrFail($id);
        
        $this->authorize('restore', $document);

        $document->restore();

        $this->auditService->log('document_restored', $document);

        return back()->with('success', 'Document restored successfully.');
    }

    /**
     * Permanently delete the specified document from storage.
     */
    public function forceDelete(int $id): RedirectResponse
    {
        $document = Document::onlyTrashed()->findOrFail($id);
        
        $this->authorize('forceDelete', $document);

        // Delete file from disk
        $filePath = config('securevault.vault_path') . '/' . $document->encrypted_name;
        if (File::exists($filePath)) {
            File::delete($filePath);
        }

        $document->forceDelete();

        $this->auditService->log('document_permanently_deleted', null, [
            'original_name' => $document->original_name,
            'document_id' => $document->id
        ]);

        return back()->with('success', 'Document permanently deleted.');
    }
}
