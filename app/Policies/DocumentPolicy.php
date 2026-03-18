<?php

namespace App\Policies;

use App\Models\Document;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class DocumentPolicy
{
    /**
     * Determine whether the user can view the document.
     * Accessible by owner OR any user with an active share.
     */
    public function view(User $user, Document $document): bool
    {
        if ($user->id === $document->user_id) {
            return true;
        }

        return $document->shares()
            ->where('shared_with_id', $user->id)
            ->active()
            ->exists();
    }

    /**
     * Determine whether the user can download the document.
     * Accessible by owner OR user with 'download' or 'full_access' permission.
     */
    public function download(User $user, Document $document): bool
    {
        if ($user->id === $document->user_id) {
            return true;
        }

        return $document->shares()
            ->where('shared_with_id', $user->id)
            ->whereIn('permission', ['download', 'full_access'])
            ->active()
            ->exists();
    }

    /**
     * Determine whether the user can update the document metadata/shares.
     * Accessible by owner OR user with 'full_access' permission.
     */
    public function update(User $user, Document $document): bool
    {
        if ($user->id === $document->user_id) {
            return true;
        }

        return $document->shares()
            ->where('shared_with_id', $user->id)
            ->where('permission', 'full_access')
            ->active()
            ->exists();
    }

    /**
     * Determine whether the user can delete the document (soft delete).
     * Only owner can delete.
     */
    public function delete(User $user, Document $document): bool
    {
        return $user->id === $document->user_id;
    }

    /**
     * Determine whether the user can restore the document.
     * Only owner can restore.
     */
    public function restore(User $user, Document $document): bool
    {
        return $user->id === $document->user_id;
    }

    /**
     * Determine whether the user can permanently delete the document.
     * Only owner can force delete.
     */
    public function forceDelete(User $user, Document $document): bool
    {
        return $user->id === $document->user_id;
    }
}
