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
use Illuminate\Support\Facades\Storage;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class DocumentScanningTest extends TestCase
{
    use RefreshDatabase;

    private string $vaultPath;
    private string $scanStagingPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->vaultPath = storage_path('framework/testing/vault');
        $this->scanStagingPath = storage_path('framework/testing/scan-staging');

        config(['securevault.vault_path' => $this->vaultPath]);
        config(['filesystems.disks.scan-staging.root' => $this->scanStagingPath]);

        File::deleteDirectory($this->vaultPath);
        File::deleteDirectory($this->scanStagingPath);
        File::ensureDirectoryExists($this->vaultPath);
        File::ensureDirectoryExists($this->scanStagingPath);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->vaultPath);
        File::deleteDirectory($this->scanStagingPath);
        File::delete(storage_path('framework/testing/plain-scan-fixture.txt'));

        parent::tearDown();
    }

    public function test_virustotal_receives_plaintext_staging_file_not_vault_blob(): void
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
        $this->assertFileExists($this->vaultPath.DIRECTORY_SEPARATOR.$document->encrypted_name);
        Queue::assertPushed(ScanDocumentWithVirusTotal::class, function (ScanDocumentWithVirusTotal $job) use ($document): bool {
            $this->assertSame($document->id, $job->documentId);
            $this->assertNotEmpty($job->stagingName);

            $stagingPath = Storage::disk('scan-staging')->path($job->stagingName);

            $this->assertStringStartsWith($this->scanStagingPath, $stagingPath);
            $this->assertStringNotContainsString('vault', str_replace('\\', '/', $stagingPath));
            $this->assertTrue(Storage::disk('scan-staging')->exists($job->stagingName));

            return true;
        });
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
        $stagingName = (string) str()->uuid().'.tmp';
        Storage::disk('scan-staging')->put($stagingName, 'plain-content');

        $this->mock(VirusTotalService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('scan')
                ->once()
                ->withArgs(function (string $path): bool {
                    return File::exists($path) && File::get($path) === 'plain-content';
                })
                ->andReturn('malicious');
        });

        $job = new ScanDocumentWithVirusTotal($document->id, $stagingName);
        $job->handle(app(VirusTotalService::class), app(AuditService::class));

        $reloaded = Document::withTrashed()->findOrFail($document->id);

        $this->assertSame('malicious', $reloaded->scan_result);
        $this->assertNotNull($reloaded->deleted_at);
        $this->assertFalse(Storage::disk('scan-staging')->exists($stagingName));
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'malware_detected',
            'auditable_type' => Document::class,
            'auditable_id' => $document->id,
        ]);
    }

    public function test_staging_file_deleted_even_when_virustotal_throws(): void
    {
        $user = User::factory()->create();
        $document = $this->createDocument($user, [
            'scan_result' => 'pending',
        ]);
        $stagingName = (string) str()->uuid().'.tmp';
        Storage::disk('scan-staging')->put($stagingName, 'plain-content');

        $this->mock(VirusTotalService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('scan')
                ->once()
                ->andThrow(new RuntimeException('VirusTotal unavailable'));
        });

        $job = new ScanDocumentWithVirusTotal($document->id, $stagingName);
        $job->handle(app(VirusTotalService::class), app(AuditService::class));

        $this->assertSame('unavailable', $document->fresh()->scan_result);
        $this->assertFalse(Storage::disk('scan-staging')->exists($stagingName));
    }

    public function test_staging_file_deleted_when_upload_flow_fails_after_staging(): void
    {
        Queue::fake();

        $this->mock(EncryptionService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('encryptFile')
                ->once()
                ->andThrow(new RuntimeException('Encryption failed after staging.'));
        });

        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('contract.pdf', 256, 'application/pdf');

        $this->withoutExceptionHandling();

        try {
            $this->actingAs($user)->post(route('documents.store', absolute: false), [
                'document' => $file,
            ]);

            $this->fail('Expected the upload flow to throw after staging.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Encryption failed after staging.', $exception->getMessage());
        }

        $this->assertSame([], Storage::disk('scan-staging')->allFiles());
        $this->assertDatabaseCount('documents', 0);
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

}
