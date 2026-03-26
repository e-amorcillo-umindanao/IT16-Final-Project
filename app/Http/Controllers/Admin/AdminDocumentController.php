<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Document;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDocumentController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Document::with('user')
            ->whereNull('deleted_at')
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('original_name', 'like', '%' . $request->search . '%')
                    ->orWhereHas('user', fn ($u) => $u
                        ->where('name', 'like', '%' . $request->search . '%')
                        ->orWhere('email', 'like', '%' . $request->search . '%'));
            });
        }

        if ($request->filled('type')) {
            $mimeMap = [
                'pdf' => 'application/pdf',
                'word' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'excel' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'image' => ['image/jpeg', 'image/png'],
            ];

            $mime = $mimeMap[$request->type] ?? null;

            if ($mime) {
                is_array($mime)
                    ? $query->whereIn('mime_type', $mime)
                    : $query->where('mime_type', $mime);
            }
        }

        if ($request->filled('owner')) {
            $query->whereHas('user', fn ($q) => $q
                ->where('name', 'like', '%' . $request->owner . '%')
                ->orWhere('email', 'like', '%' . $request->owner . '%'));
        }

        $paginated = $query->paginate(15)->withQueryString();
        $documentIds = $paginated->getCollection()->pluck('id');
        $violatedIds = AuditLog::where('action', 'integrity_violation')
            ->whereIn('auditable_id', $documentIds)
            ->where('auditable_type', Document::class)
            ->pluck('auditable_id')
            ->flip();

        return Inertia::render('Admin/Documents/Index', [
            'documents' => $paginated->through(fn (Document $doc) => [
                'id' => $doc->id,
                'original_name' => $doc->original_name,
                'mime_type' => $doc->mime_type,
                'file_size' => $doc->file_size,
                'scan_result' => is_string($doc->scan_result) ? $doc->scan_result : 'unscanned',
                'created_at' => $doc->created_at,
                'has_integrity_violation' => isset($violatedIds[$doc->id]),
                'user' => [
                    'name' => $doc->user->name,
                    'email' => $doc->user->email,
                    'avatar_url' => $doc->user->avatar_url,
                ],
            ]),
            'filters' => $request->only(['search', 'type', 'owner']),
        ]);
    }

    public function export()
    {
        $documents = Document::with('user')
            ->whereNull('deleted_at')
            ->orderByDesc('created_at')
            ->get();

        $csv = "ID,Filename,Owner,Email,MIME Type,Size (bytes),Uploaded\n";
        foreach ($documents as $doc) {
            $csv .= implode(',', [
                $doc->id,
                '"' . str_replace('"', '""', $doc->original_name) . '"',
                '"' . str_replace('"', '""', $doc->user->name) . '"',
                $doc->user->email,
                $doc->mime_type,
                $doc->file_size,
                $doc->created_at->toIso8601String(),
            ]) . "\n";
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="all-documents.csv"',
        ]);
    }
}
