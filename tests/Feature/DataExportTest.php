<?php

namespace Tests\Feature;

use App\Jobs\ExportUserDataJob;
use App\Mail\DataExportReadyMail;
use App\Models\AuditLog;
use App\Models\DataExport;
use App\Models\Document;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use Illuminate\Support\Str;
use Tests\TestCase;
use ZipArchive;

class DataExportTest extends TestCase
{
    use RefreshDatabase;

    private string $exportPath;
    private ?string $exportBackupPath = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->exportPath = storage_path('app/exports');

        if (File::isDirectory($this->exportPath)) {
            $this->exportBackupPath = storage_path('app/'.Str::uuid().'-exports-backup');
            File::copyDirectory($this->exportPath, $this->exportBackupPath);
            File::deleteDirectory($this->exportPath);
        }

        File::ensureDirectoryExists($this->exportPath);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->exportPath);

        if ($this->exportBackupPath && File::isDirectory($this->exportBackupPath)) {
            File::copyDirectory($this->exportBackupPath, $this->exportPath);
            File::deleteDirectory($this->exportBackupPath);
        }

        parent::tearDown();
    }

    public function test_user_can_request_a_data_export_once_per_day(): void
    {
        Queue::fake();

        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->from(route('profile.edit', absolute: false))
            ->post(route('profile.export.request', absolute: false));

        $response->assertRedirect(route('profile.edit', absolute: false));
        $this->assertDatabaseHas('data_exports', [
            'user_id' => $user->id,
            'status' => 'pending',
        ]);
        Queue::assertPushed(ExportUserDataJob::class, 1);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'data_export_requested',
            'user_id' => $user->id,
        ]);

        $secondResponse = $this->actingAs($user)
            ->from(route('profile.edit', absolute: false))
            ->post(route('profile.export.request', absolute: false));

        $secondResponse
            ->assertRedirect(route('profile.edit', absolute: false))
            ->assertSessionHasErrors('export');
    }

    public function test_profile_page_receives_ready_export_download_details(): void
    {
        $user = User::factory()->create();

        $export = DataExport::query()->create([
            'user_id' => $user->id,
            'token' => str_repeat('d', 64),
            'file_path' => 'exports/profile_export.zip',
            'status' => 'ready',
            'expires_at' => now()->addHours(24),
        ]);

        File::put($this->exportPath.DIRECTORY_SEPARATOR.'profile_export.zip', 'zip-placeholder');

        $this->actingAs($user)
            ->get(route('profile.edit'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Profile/Edit')
                ->where('latest_export.status', 'ready')
                ->where('latest_export.expires_at', $export->expires_at?->toIso8601String())
                ->where('latest_export.download_url', fn (string $url) => str_contains($url, $export->token))
                ->where('has_pending_export', true));
    }

    public function test_missing_ready_export_is_expired_and_does_not_block_a_new_request(): void
    {
        Queue::fake();

        $user = User::factory()->create();

        $brokenExport = DataExport::query()->create([
            'user_id' => $user->id,
            'token' => str_repeat('e', 64),
            'file_path' => 'exports/missing.zip',
            'status' => 'ready',
            'expires_at' => now()->addHours(24),
        ]);

        $response = $this->actingAs($user)
            ->from(route('profile.edit', absolute: false))
            ->post(route('profile.export.request', absolute: false));

        $response
            ->assertRedirect(route('profile.edit', absolute: false))
            ->assertSessionHasNoErrors();

        $brokenExport->refresh();

        $this->assertSame('expired', $brokenExport->status);
        $this->assertDatabaseHas('data_exports', [
            'user_id' => $user->id,
            'status' => 'pending',
        ]);
        Queue::assertPushed(ExportUserDataJob::class, 1);
    }

    public function test_export_job_creates_the_archive_and_emails_the_user(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'name' => 'John Doe',
            'email' => 'john@example.com',
        ]);

        Document::query()->create([
            'user_id' => $user->id,
            'original_name' => 'report.pdf',
            'encrypted_name' => 'report.enc',
            'mime_type' => 'application/pdf',
            'file_size' => 2048,
            'file_hash' => hash('sha256', 'report'),
            'encryption_iv' => base64_encode(random_bytes(16)),
            'description' => null,
            'current_version' => 1,
            'scan_result' => 'clean',
        ]);

        $this->actingAs($user);
        app(AuditService::class)->log('profile_updated');
        auth()->logout();

        $export = DataExport::query()->create([
            'user_id' => $user->id,
            'token' => str_repeat('a', 64),
            'status' => 'pending',
            'expires_at' => now()->addHours(24),
        ]);

        (new ExportUserDataJob($user, $export))->handle();

        $export->refresh();

        $this->assertSame('ready', $export->status);
        $this->assertNotNull($export->file_path);
        $this->assertFileExists(storage_path("app/{$export->file_path}"));

        $zip = new ZipArchive();
        $opened = $zip->open(storage_path("app/{$export->file_path}"));
        $this->assertTrue($opened === true);

        $profileJson = json_decode((string) $zip->getFromName('profile.json'), true, 512, JSON_THROW_ON_ERROR);
        $documentsJson = json_decode((string) $zip->getFromName('documents.json'), true, 512, JSON_THROW_ON_ERROR);
        $activityJson = json_decode((string) $zip->getFromName('activity.json'), true, 512, JSON_THROW_ON_ERROR);

        $zip->close();

        $this->assertSame('John Doe', $profileJson['name']);
        $this->assertSame('john@example.com', $profileJson['email']);
        $this->assertCount(1, $documentsJson);
        $this->assertSame('report.pdf', $documentsJson[0]['original_name']);
        $this->assertArrayNotHasKey('encryption_iv', $documentsJson[0]);
        $this->assertNotEmpty($activityJson);

        Mail::assertSent(DataExportReadyMail::class, function (DataExportReadyMail $mail) use ($export): bool {
            return $mail->export->is($export)
                && str_contains($mail->downloadUrl, "/exports/{$export->token}/download");
        });
    }

    public function test_signed_export_download_marks_the_export_as_downloaded(): void
    {
        $user = User::factory()->create();
        $export = DataExport::query()->create([
            'user_id' => $user->id,
            'token' => str_repeat('b', 64),
            'file_path' => 'exports/export_test.zip',
            'status' => 'ready',
            'expires_at' => now()->addHours(24),
        ]);

        File::put(storage_path('app/exports/export_test.zip'), 'zip-placeholder');

        $url = URL::temporarySignedRoute(
            'exports.download',
            now()->addHour(),
            ['token' => $export->token],
        );

        $response = $this->get($url);

        $response->assertOk()->assertDownload('securevault-export.zip');

        $export->refresh();
        $this->assertSame('downloaded', $export->status);
    }

    public function test_purge_expired_exports_command_marks_exports_expired_and_deletes_their_files(): void
    {
        $user = User::factory()->create();
        $export = DataExport::query()->create([
            'user_id' => $user->id,
            'token' => str_repeat('c', 64),
            'file_path' => 'exports/expired_export.zip',
            'status' => 'ready',
            'expires_at' => now()->subHour(),
        ]);

        File::put(storage_path('app/exports/expired_export.zip'), 'expired-zip');

        $this->artisan('securevault:purge-expired-exports')
            ->expectsOutput('Purged 1 expired export(s).')
            ->assertExitCode(0);

        $export->refresh();

        $this->assertSame('expired', $export->status);
        $this->assertFileDoesNotExist(storage_path('app/exports/expired_export.zip'));
    }
}
