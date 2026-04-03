<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\User;
use InvalidArgumentException;

class DocumentVersionService
{
    private const VERSION_ACTIONS = [
        'document_uploaded',
        'document_version_uploaded',
        'document_version_restored',
    ];

    public function archiveCurrentVersion(Document $document): DocumentVersion
    {
        $latestVersionNumber = (int) ($document->versions()->max('version_number') ?? 0);
        $latestVersionAudit = $this->latestVersionAudit($document);

        return DocumentVersion::create([
            'document_id' => $document->id,
            'version_number' => $latestVersionNumber + 1,
            'original_name' => $document->original_name,
            'encrypted_name' => $document->encrypted_name,
            'mime_type' => $document->mime_type,
            'file_size' => $document->file_size,
            'encryption_iv' => $document->encryption_iv,
            'file_hash' => $document->file_hash,
            'uploaded_by' => $latestVersionAudit?->user_id ?? $document->user_id,
            'created_at' => $latestVersionAudit?->created_at ?? $document->created_at ?? now(),
        ]);
    }

    public function restoreVersion(Document $document, DocumentVersion $version, User $restoredBy): void
    {
        if ($version->document_id !== $document->id) {
            throw new InvalidArgumentException('The selected version does not belong to this document.');
        }

        $this->archiveCurrentVersion($document);

        $document->update([
            'original_name' => $version->original_name,
            'encrypted_name' => $version->encrypted_name,
            'mime_type' => $version->mime_type,
            'file_size' => $version->file_size,
            'encryption_iv' => $version->encryption_iv,
            'file_hash' => $version->file_hash,
            'current_version' => $document->current_version + 1,
        ]);

        $version->delete();
    }

    private function latestVersionAudit(Document $document): ?AuditLog
    {
        return AuditLog::query()
            ->where('auditable_type', Document::class)
            ->where('auditable_id', $document->id)
            ->whereIn('action', self::VERSION_ACTIONS)
            ->latest('id')
            ->first();
    }
}
