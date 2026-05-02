<?php

namespace Tests\Feature;

use App\Jobs\ScanDocumentWithVirusTotal;
use App\Models\Document;
use App\Models\User;
use App\Services\AuditService;
use App\Services\EncryptionService;
use App\Services\VirusTotalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Queue;
use Mockery\MockInterface;
use Tests\TestCase;

class DocumentScanningTest extends TestCase
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
        File::delete(storage_path('framework/testing/plain-scan-fixture.txt'));

        parent::tearDown();
    }

    public function test_upload_marks_document_pending_and_dispatches_async_scan_job(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('contract.pdf', 256, 'application/pdf');

        $response = $this->actingAs($user)->post(route('documents.store', absolute: false), [
            'document' => $file,
        ]);

        $document = Document::query()->firstOrFail();

        $response->assertRedirect(route('documents.index', absolute: false));
        $this->assertSame('pending', $document->scan_result);
        Queue::assertPushed(ScanDocumentWithVirusTotal::class, 1);
        $this->assertFileExists($this->vaultPath.DIRECTORY_SEPARATOR.$document->encrypted_name);
    }

    public function test_webp_uploads_are_allowed(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('preview.webp', 256, 'image/webp');

        $response = $this->actingAs($user)->post(route('documents.store', absolute: false), [
            'document' => $file,
        ]);

        $document = Document::query()->firstOrFail();

        $response->assertRedirect(route('documents.index', absolute: false));
        $this->assertSame('image/webp', $document->mime_type);
        $this->assertSame('pending', $document->scan_result);
    }

    public function test_pending_document_download_is_blocked(): void
    {
        $user = User::factory()->create();
        $document = $this->createDocument($user, [
            'scan_result' => 'pending',
        ]);

        $response = $this->actingAs($user)
            ->from(route('documents.index', absolute: false))
            ->get(route('documents.download', $document, absolute: false));

        $response
            ->assertRedirect(route('documents.index', absolute: false))
            ->assertSessionHasErrors('download')
            ->assertSessionHas('error', 'This file is still being scanned for malware. Please try again in a moment.');
    }

    public function test_bulk_download_is_blocked_when_a_selected_document_is_pending(): void
    {
        $user = User::factory()->create();
        $document = $this->createDocument($user, [
            'scan_result' => 'pending',
        ]);

        $response = $this->actingAs($user)->postJson(route('documents.bulk-download', absolute: false), [
            'ids' => [$document->id],
        ]);

        $response
            ->assertStatus(409)
            ->assertJson([
                'error' => 'One or more selected files are still being scanned for malware. Please try again in a moment.',
            ]);
    }

    public function test_malicious_async_scan_soft_deletes_document_and_records_audit_log(): void
    {
        $user = User::factory()->create();
        $document = $this->createDocument($user, [
            'scan_result' => 'pending',
        ]);

        $encrypted = app(EncryptionService::class)->encryptFile($this->writePlaintextFixture('plain-content'));
        File::put($this->vaultPath.DIRECTORY_SEPARATOR.$document->encrypted_name, $encrypted['encrypted_content']);
        $document->update([
            'encryption_iv' => $encrypted['iv'],
            'file_hash' => $encrypted['original_hash'],
        ]);

        $this->mock(VirusTotalService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('scan')
                ->once()
                ->withArgs(function (string $path): bool {
                    return File::exists($path) && File::get($path) === 'plain-content';
                })
                ->andReturn('malicious');
        });

        $job = new ScanDocumentWithVirusTotal($document);
        $job->handle(app(VirusTotalService::class), app(AuditService::class), app(EncryptionService::class));

        $reloaded = Document::withTrashed()->findOrFail($document->id);

        $this->assertSame('malicious', $reloaded->scan_result);
        $this->assertNotNull($reloaded->deleted_at);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'malware_detected',
            'auditable_type' => Document::class,
            'auditable_id' => $document->id,
        ]);
    }

    private function createDocument(User $user, array $attributes = []): Document
    {
        return Document::query()->create(array_merge([
            'user_id' => $user->id,
            'original_name' => 'contract.pdf',
            'encrypted_name' => uniqid('doc_', true).'.enc',
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'file_hash' => hash('sha256', 'plain-content'),
            'encryption_iv' => base64_encode(random_bytes(16)),
            'description' => null,
            'scan_result' => 'clean',
        ], $attributes));
    }

    private function writePlaintextFixture(string $contents): string
    {
        $path = storage_path('framework/testing/plain-scan-fixture.txt');
        File::put($path, $contents);

        return $path;
    }
}
