<?php

namespace Tests\Feature;

use App\Jobs\ScanDocumentWithVirusTotal;
use App\Models\Document;
use App\Models\DocumentShare;
use App\Models\DocumentVersion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DocumentVersionTest extends TestCase
{
    use RefreshDatabase;

    private string $vaultPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vaultPath = storage_path('framework/testing/vault');
        config(['securevault.vault_path' => $this->vaultPath]);

        File::deleteDirectory($this->vaultPath);
        File::ensureDirectoryExists($this->vaultPath);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->vaultPath);

        parent::tearDown();
    }

    public function test_replacing_document_archives_the_current_file_and_marks_the_new_one_pending(): void
    {
        Queue::fake();

        $owner = User::factory()->create();
        $document = $this->createDocument($owner, [
            'original_name' => 'proposal-v1.pdf',
            'encrypted_name' => 'proposal-v1.enc',
            'current_version' => 1,
            'scan_result' => 'clean',
        ]);

        File::put($this->vaultPath.DIRECTORY_SEPARATOR.'proposal-v1.enc', 'encrypted-v1');

        $file = UploadedFile::fake()->create('proposal-v2.pdf', 256, 'application/pdf');

        $response = $this->actingAs($owner)
            ->from(route('documents.show', $document, absolute: false))
            ->post(route('documents.replace', $document, absolute: false), [
                'file' => $file,
            ]);

        $document->refresh();
        $version = DocumentVersion::query()->where('document_id', $document->id)->first();

        $response->assertRedirect(route('documents.show', $document, absolute: false));
        $this->assertNotNull($version);
        $this->assertSame('proposal-v1.pdf', $version->original_name);
        $this->assertSame('proposal-v1.enc', $version->encrypted_name);
        $this->assertSame(1, $version->version_number);
        $this->assertSame(2, $document->current_version);
        $this->assertSame('proposal-v2.pdf', $document->original_name);
        $this->assertSame('pending', $document->scan_result);
        $this->assertFileExists($this->vaultPath.DIRECTORY_SEPARATOR.'proposal-v1.enc');
        $this->assertFileExists($this->vaultPath.DIRECTORY_SEPARATOR.$document->encrypted_name);
        Queue::assertPushed(ScanDocumentWithVirusTotal::class, 1);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document_version_uploaded',
            'auditable_type' => Document::class,
            'auditable_id' => $document->id,
        ]);
    }

    public function test_full_access_collaborator_can_replace_document(): void
    {
        Queue::fake();

        $owner = User::factory()->create();
        $collaborator = User::factory()->create();
        $document = $this->createDocument($owner, [
            'original_name' => 'shared-v1.pdf',
            'encrypted_name' => 'shared-v1.enc',
            'current_version' => 1,
        ]);

        DocumentShare::query()->create([
            'document_id' => $document->id,
            'shared_by_id' => $owner->id,
            'shared_with_id' => $collaborator->id,
            'permission' => 'full_access',
        ]);

        File::put($this->vaultPath.DIRECTORY_SEPARATOR.'shared-v1.enc', 'encrypted-shared-v1');

        $response = $this->actingAs($collaborator)->post(route('documents.replace', $document, absolute: false), [
            'file' => UploadedFile::fake()->create('shared-v2.pdf', 128, 'application/pdf'),
        ]);

        $document->refresh();

        $response->assertStatus(302);
        $this->assertSame(2, $document->current_version);
        $this->assertSame('shared-v2.pdf', $document->original_name);
        $this->assertDatabaseHas('document_versions', [
            'document_id' => $document->id,
            'version_number' => 1,
            'original_name' => 'shared-v1.pdf',
        ]);
    }

    public function test_restoring_a_version_archives_the_current_file_and_promotes_the_selected_version(): void
    {
        $owner = User::factory()->create();
        $document = $this->createDocument($owner, [
            'original_name' => 'proposal-v2.pdf',
            'encrypted_name' => 'proposal-v2.enc',
            'current_version' => 2,
        ]);

        $version = DocumentVersion::query()->create([
            'document_id' => $document->id,
            'version_number' => 1,
            'original_name' => 'proposal-v1.pdf',
            'encrypted_name' => 'proposal-v1.enc',
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'encryption_iv' => base64_encode(random_bytes(16)),
            'file_hash' => hash('sha256', 'proposal-v1'),
            'uploaded_by' => $owner->id,
            'created_at' => now()->subDay(),
        ]);

        $response = $this->actingAs($owner)
            ->from(route('documents.show', $document, absolute: false))
            ->post(route('documents.versions.restore', [$document->id, $version->id], absolute: false));

        $document->refresh();

        $response->assertRedirect(route('documents.show', $document, absolute: false));
        $this->assertSame('proposal-v1.pdf', $document->original_name);
        $this->assertSame('proposal-v1.enc', $document->encrypted_name);
        $this->assertSame(3, $document->current_version);
        $this->assertDatabaseMissing('document_versions', [
            'id' => $version->id,
        ]);
        $this->assertDatabaseHas('document_versions', [
            'document_id' => $document->id,
            'version_number' => 2,
            'original_name' => 'proposal-v2.pdf',
            'encrypted_name' => 'proposal-v2.enc',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'document_version_restored',
            'auditable_type' => Document::class,
            'auditable_id' => $document->id,
        ]);
    }

    public function test_force_delete_removes_current_and_archived_version_files(): void
    {
        $owner = User::factory()->create();
        $document = $this->createDocument($owner, [
            'encrypted_name' => 'current.enc',
        ]);

        DocumentVersion::query()->create([
            'document_id' => $document->id,
            'version_number' => 1,
            'original_name' => 'older.pdf',
            'encrypted_name' => 'older.enc',
            'mime_type' => 'application/pdf',
            'file_size' => 512,
            'encryption_iv' => base64_encode(random_bytes(16)),
            'file_hash' => hash('sha256', 'older'),
            'uploaded_by' => $owner->id,
            'created_at' => now()->subDay(),
        ]);

        File::put($this->vaultPath.DIRECTORY_SEPARATOR.'current.enc', 'current-file');
        File::put($this->vaultPath.DIRECTORY_SEPARATOR.'older.enc', 'older-file');

        $document->delete();

        $response = $this->actingAs($owner)->delete(route('documents.force-delete', $document->id, absolute: false));

        $response->assertRedirect();
        $this->assertFileDoesNotExist($this->vaultPath.DIRECTORY_SEPARATOR.'current.enc');
        $this->assertFileDoesNotExist($this->vaultPath.DIRECTORY_SEPARATOR.'older.enc');
        $this->assertDatabaseMissing('documents', [
            'id' => $document->id,
        ]);
        $this->assertDatabaseMissing('document_versions', [
            'document_id' => $document->id,
        ]);
    }

    private function createDocument(User $user, array $attributes = []): Document
    {
        return Document::query()->create(array_merge([
            'user_id' => $user->id,
            'original_name' => 'proposal.pdf',
            'encrypted_name' => uniqid('doc_', true).'.enc',
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'file_hash' => hash('sha256', 'plain-content'),
            'encryption_iv' => base64_encode(random_bytes(16)),
            'description' => null,
            'current_version' => 1,
            'scan_result' => 'clean',
        ], $attributes));
    }
}
