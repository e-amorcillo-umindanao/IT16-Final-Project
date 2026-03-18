<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Models\DocumentShare;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ShareController extends Controller
{
    use AuthorizesRequests;

    protected $auditService;

    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Store a new document share or update an existing one.
     */
    public function store(Request $request, Document $document): RedirectResponse
    {
        // Re-use 'update' permission (owner or full_access sharer)
        $this->authorize('update', $document);

        $request->validate([
            'email' => [
                'required',
                'email',
                'exists:users,email',
                function ($attribute, $value, $fail) use ($document) {
                    if ($value === Auth::user()->email) {
                        $fail('You cannot share a document with yourself.');
                    }
                },
            ],
            'permission' => 'required|in:view_only,download,full_access',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $targetUser = User::where('email', $request->email)->firstOrFail();

        // updateOrCreate to prevent duplicates for the same document+user pair
        $share = DocumentShare::updateOrCreate(
            [
                'document_id' => $document->id,
                'shared_with_id' => $targetUser->id,
            ],
            [
                'shared_by_id' => Auth::id(),
                'permission' => $request->permission,
                'expires_at' => $request->expires_at,
            ]
        );

        $this->auditService->log('document_shared', $document, [
            'shared_with' => $targetUser->email,
            'permission' => $request->permission,
            'expires_at' => $request->expires_at,
        ]);

        return back()->with('success', "Document successfully shared with {$targetUser->name}.");
    }

    /**
     * Remove the specified share (revoke access).
     */
    public function destroy(DocumentShare $share): RedirectResponse
    {
        $document = $share->document;

        // Authorize: Only the document owner or the person who created the share can revoke it
        if (Auth::id() !== $document->user_id && Auth::id() !== $share->shared_by_id) {
            abort(403, 'Unauthorized to revoke this share.');
        }

        $revokedUserEmail = $share->sharedWith->email;
        $share->delete();

        $this->auditService->log('share_revoked', $document, [
            'revoked_from' => $revokedUserEmail,
        ]);

        return back()->with('success', "Access revoked for {$revokedUserEmail}.");
    }

    /**
     * Display a listing of documents shared with the current user.
     */
    public function sharedWithMe(): Response
    {
        $shares = DocumentShare::where('shared_with_id', Auth::id())
            ->active() // Non-expired
            ->with(['document.user:id,name', 'sharedBy:id,name,email'])
            ->latest()
            ->paginate(15);

        return Inertia::render('Shared/Index', [
            'shares' => $shares,
        ]);
    }
}
