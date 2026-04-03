<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Document;
use App\Models\User;
use App\Services\EncryptionService;
use App\Services\PdfWatermarkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Mockery\MockInterface;
use RuntimeException;
use Tests\TestCase;

class PdfWatermarkDownloadTest extends TestCase
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

    public function test_pdf_download_is_watermarked_and_logged(): void
    {
        $user = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
        ]);

        $pdfContent = $this->makePdf(['Quarterly Report']);
        $document = $this->createEncryptedDocument($user, 'report.pdf', 'application/pdf', $pdfContent);

        $response = $this->actingAs($user)->get(route('documents.download', $document, absolute: false));

        $response->assertOk()->assertDownload('report.pdf');

        $downloadedContent = $response->streamedContent();
        $auditLog = AuditLog::query()
            ->where('action', 'document_downloaded')
            ->where('auditable_type', Document::class)
            ->where('auditable_id', $document->id)
            ->latest('id')
            ->firstOrFail();

        $this->assertNotSame($pdfContent, $downloadedContent);
        $this->assertStringContainsString('John Doe', $downloadedContent);
        $this->assertStringContainsString('john@example.com', $downloadedContent);
        $this->assertStringContainsString('report.pdf', $downloadedContent);
        $this->assertTrue((bool) ($auditLog->metadata['watermarked'] ?? false));
    }

    public function test_non_pdf_download_is_served_without_watermark(): void
    {
        $user = User::factory()->create();
        $content = 'plain-image-placeholder';
        $document = $this->createEncryptedDocument($user, 'image.png', 'image/png', $content);

        $response = $this->actingAs($user)->get(route('documents.download', $document, absolute: false));

        $response->assertOk()->assertDownload('image.png');

        $auditLog = AuditLog::query()
            ->where('action', 'document_downloaded')
            ->where('auditable_type', Document::class)
            ->where('auditable_id', $document->id)
            ->latest('id')
            ->firstOrFail();

        $this->assertSame($content, $response->streamedContent());
        $this->assertFalse((bool) ($auditLog->metadata['watermarked'] ?? true));
    }

    public function test_pdf_watermark_failures_fall_open_and_log_the_error(): void
    {
        Log::spy();

        $this->mock(PdfWatermarkService::class, function (MockInterface $mock): void {
            $mock->shouldReceive('apply')
                ->once()
                ->andThrow(new RuntimeException('watermark failed'));
        });

        $user = User::factory()->create();
        $pdfContent = $this->makePdf(['Sensitive Contract']);
        $document = $this->createEncryptedDocument($user, 'contract.pdf', 'application/pdf', $pdfContent);

        $response = $this->actingAs($user)->get(route('documents.download', $document, absolute: false));

        $response->assertOk()->assertDownload('contract.pdf');

        $auditLog = AuditLog::query()
            ->where('action', 'document_downloaded')
            ->where('auditable_type', Document::class)
            ->where('auditable_id', $document->id)
            ->latest('id')
            ->firstOrFail();

        $this->assertSame($pdfContent, $response->streamedContent());
        $this->assertFalse((bool) ($auditLog->metadata['watermarked'] ?? true));
        Log::shouldHaveReceived('error')
            ->once()
            ->withArgs(fn (string $message, array $context): bool => $message === 'PDF watermark failed'
                && $context['document_id'] === $document->id);
    }

    private function createEncryptedDocument(User $user, string $name, string $mimeType, string $content): Document
    {
        $sourcePath = storage_path('framework/testing/'.uniqid('watermark_', true));
        File::put($sourcePath, $content);

        $encryptedData = app(EncryptionService::class)->encryptFile($sourcePath);
        $encryptedName = uniqid('doc_', true).'.enc';

        File::put($this->vaultPath.DIRECTORY_SEPARATOR.$encryptedName, $encryptedData['encrypted_content']);
        File::delete($sourcePath);

        return Document::query()->create([
            'user_id' => $user->id,
            'original_name' => $name,
            'encrypted_name' => $encryptedName,
            'mime_type' => $mimeType,
            'file_size' => strlen($content),
            'file_hash' => $encryptedData['original_hash'],
            'encryption_iv' => $encryptedData['iv'],
            'description' => null,
            'current_version' => 1,
            'scan_result' => 'clean',
        ]);
    }

    private function makePdf(array $lines): string
    {
        $pdf = new \FPDF();
        $pdf->SetCompression(false);
        $pdf->AddPage();
        $pdf->SetFont('Helvetica', '', 12);

        foreach ($lines as $line) {
            $pdf->Cell(0, 10, $line, 0, 1);
        }

        return $pdf->Output('S');
    }
}
