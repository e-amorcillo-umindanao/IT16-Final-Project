<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TrashTest extends TestCase
{
    use RefreshDatabase;

    public function test_trash_page_filters_deleted_documents_by_name(): void
    {
        $user = User::factory()->create();

        $matchingDocument = $this->createDeletedDocument($user, 'budget-report.pdf');
        $this->createDeletedDocument($user, 'meeting-notes.pdf');
        $this->createDeletedDocument(User::factory()->create(), 'budget-foreign.pdf');

        $this->actingAs($user)
            ->get(route('documents.trash', ['search' => 'budget']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Trash/Index')
                ->where('search', 'budget')
                ->has('documents.data', 1)
                ->where('documents.data.0.id', $matchingDocument->id)
                ->where('documents.data.0.original_name', 'budget-report.pdf'));
    }

    public function test_restore_selected_only_restores_the_authenticated_users_deleted_documents(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $restorable = $this->createDeletedDocument($user, 'restore-me.pdf');
        $stillDeleted = $this->createDeletedDocument($user, 'keep-in-trash.pdf');
        $otherUsersDocument = $this->createDeletedDocument($otherUser, 'other-user.pdf');

        $response = $this->actingAs($user)
            ->from(route('documents.trash', absolute: false))
            ->post(route('documents.restore-selected', absolute: false), [
                'ids' => [$restorable->id, $otherUsersDocument->id],
            ]);

        $response
            ->assertRedirect(route('documents.trash', absolute: false))
            ->assertSessionHasNoErrors();

        $this->assertNull($restorable->fresh()?->deleted_at);
        $this->assertNotNull($stillDeleted->fresh()?->deleted_at);
        $this->assertNotNull($otherUsersDocument->fresh()?->deleted_at);
    }

    private function createDeletedDocument(User $user, string $name): Document
    {
        $document = Document::query()->create([
            'user_id' => $user->id,
            'original_name' => $name,
            'encrypted_name' => Str::uuid().'.enc',
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'encryption_iv' => 'test-iv',
            'file_hash' => str_repeat('a', 64),
            'scan_result' => 'clean',
            'current_version' => 1,
        ]);

        $document->delete();

        return $document->fresh();
    }
}
