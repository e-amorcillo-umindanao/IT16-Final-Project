<?php

namespace Tests\Feature;

use App\Mail\AccountDeletionRequestedMail;
use App\Models\DataExport;
use App\Models\Document;
use App\Models\DocumentVersion;
use App\Models\User;
use App\Services\AuditService;
use App\Services\RecoveryCodeService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;
use RuntimeException;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
        $this->seed(RolePermissionSeeder::class);

        File::ensureDirectoryExists(storage_path('app/vault'));
        File::ensureDirectoryExists(storage_path('app/exports'));
        File::ensureDirectoryExists(storage_path('app/public/avatars'));
    }

    public function test_user_can_schedule_account_deletion_and_receive_a_cancellation_email(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'is_active' => true,
        ]);

        DB::table(config('session.table', 'sessions'))->insert([
            'id' => 'delete-test-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'payload' => 'test',
            'last_activity' => now()->timestamp,
        ]);

        $response = $this->actingAs($user)
            ->from(route('profile.edit', absolute: false))
            ->post(route('profile.delete-account', absolute: false), [
                'password' => 'password',
            ]);

        $response
            ->assertRedirect(route('login', absolute: false))
            ->assertSessionHas('status', 'deletion-scheduled');

        $user->refresh();

        $this->assertFalse($user->is_active);
        $this->assertNotNull($user->deletion_requested_at);
        $this->assertNotNull($user->deletion_scheduled_for);
        $this->assertNotNull($user->getRawOriginal('deletion_cancel_token'));
        $this->assertGuest();
        $this->assertDatabaseMissing(config('session.table', 'sessions'), [
            'id' => 'delete-test-session',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'account_deletion_requested',
            'category' => 'security',
            'user_id' => $user->id,
        ]);

        Mail::assertSent(AccountDeletionRequestedMail::class, function (AccountDeletionRequestedMail $mail) use ($user): bool {
            return $mail->hasTo($user->email)
                && $mail->cancelToken === $user->getRawOriginal('deletion_cancel_token');
        });
    }

    public function test_account_deletion_requires_the_current_password(): void
    {
        $user = User::factory()->create([
            'is_active' => true,
        ]);

        $this->actingAs($user)
            ->from(route('profile.edit', absolute: false))
            ->post(route('profile.delete-account', absolute: false), [
                'password' => 'wrong-password',
            ])
            ->assertRedirect(route('profile.edit', absolute: false))
            ->assertSessionHasErrors('password');

        $this->assertNull($user->fresh()->deletion_requested_at);
    }

    public function test_two_factor_enabled_user_cannot_schedule_deletion_with_an_invalid_code(): void
    {
        $user = User::factory()->create([
            'is_active' => true,
            'two_factor_enabled' => true,
            'two_factor_secret' => app(Google2FA::class)->generateSecretKey(),
        ]);

        $this->actingAs($user)
            ->withSession(['2fa_verified' => true])
            ->from(route('profile.edit', absolute: false))
            ->post(route('profile.delete-account', absolute: false), [
                'password' => 'password',
                'two_factor_code' => '000000',
            ])
            ->assertRedirect(route('profile.edit', absolute: false))
            ->assertSessionHasErrors('two_factor_code');

        $this->assertNull($user->fresh()->deletion_requested_at);
    }

    public function test_recovery_code_not_consumed_when_mail_fails(): void
    {
        $user = User::factory()->create([
            'is_active' => true,
            'two_factor_enabled' => true,
            'two_factor_secret' => app(Google2FA::class)->generateSecretKey(),
        ]);
        $recoveryCode = app(RecoveryCodeService::class)->generate($user)[0];

        DB::table(config('session.table', 'sessions'))->insert([
            'id' => 'mail-fail-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'payload' => 'test',
            'last_activity' => now()->timestamp,
        ]);

        Mail::shouldReceive('to')->once()->with($user->email)->andReturnSelf();
        Mail::shouldReceive('send')->once()->andThrow(new RuntimeException('SMTP unavailable'));

        $this->actingAs($user)
            ->withSession(['2fa_verified' => true])
            ->from(route('profile.edit', absolute: false))
            ->post(route('profile.delete-account', absolute: false), [
                'password' => 'password',
                'two_factor_code' => $recoveryCode,
            ])
            ->assertRedirect(route('profile.edit', absolute: false))
            ->assertSessionHasErrors('delete');

        $this->assertTrue($user->fresh()->is_active);
        $this->assertNull($user->fresh()->deletion_requested_at);
        $this->assertSame(0, $user->twoFactorRecoveryCodes()->whereNotNull('used_at')->count());
        $this->assertDatabaseHas(config('session.table', 'sessions'), [
            'id' => 'mail-fail-session',
        ]);
    }

    public function test_recovery_code_consumed_only_after_mail_success(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'is_active' => true,
            'two_factor_enabled' => true,
            'two_factor_secret' => app(Google2FA::class)->generateSecretKey(),
        ]);
        $recoveryCode = app(RecoveryCodeService::class)->generate($user)[0];

        DB::table(config('session.table', 'sessions'))->insert([
            'id' => 'mail-success-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'payload' => 'test',
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($user)
            ->withSession(['2fa_verified' => true])
            ->from(route('profile.edit', absolute: false))
            ->post(route('profile.delete-account', absolute: false), [
                'password' => 'password',
                'two_factor_code' => $recoveryCode,
            ])
            ->assertRedirect(route('login', absolute: false))
            ->assertSessionHas('status', 'deletion-scheduled');

        $this->assertFalse($user->fresh()->is_active);
        $this->assertNotNull($user->fresh()->deletion_requested_at);
        $this->assertSame(1, $user->twoFactorRecoveryCodes()->whereNotNull('used_at')->count());
        $this->assertDatabaseMissing(config('session.table', 'sessions'), [
            'id' => 'mail-success-session',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'account_deletion_requested',
            'user_id' => $user->id,
        ]);
    }

    public function test_deletion_rolls_back_if_recovery_code_is_consumed_before_transaction_commit(): void
    {
        Mail::fake();

        $this->mock(RecoveryCodeService::class, function ($mock): void {
            $mock->shouldReceive('isValid')->once()->andReturn(true);
            $mock->shouldReceive('consume')->once()->andReturn(false);
        });

        $user = User::factory()->create([
            'is_active' => true,
            'two_factor_enabled' => true,
            'two_factor_secret' => app(Google2FA::class)->generateSecretKey(),
        ]);

        DB::table(config('session.table', 'sessions'))->insert([
            'id' => 'rollback-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'payload' => 'test',
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($user)
            ->withSession(['2fa_verified' => true])
            ->from(route('profile.edit', absolute: false))
            ->post(route('profile.delete-account', absolute: false), [
                'password' => 'password',
                'two_factor_code' => 'ABCD-EFGH',
            ])
            ->assertRedirect(route('profile.edit', absolute: false))
            ->assertSessionHasErrors('delete');

        $this->assertTrue($user->fresh()->is_active);
        $this->assertNull($user->fresh()->deletion_requested_at);
        $this->assertDatabaseHas(config('session.table', 'sessions'), [
            'id' => 'rollback-session',
        ]);
        $this->assertDatabaseMissing('audit_logs', [
            'action' => 'account_deletion_requested',
            'user_id' => $user->id,
        ]);
    }

    public function test_super_admin_cannot_request_self_deletion(): void
    {
        $superAdmin = User::factory()->create([
            'is_active' => true,
        ]);
        $superAdmin->assignRole('super-admin');

        $this->actingAs($superAdmin)
            ->post(route('profile.delete-account', absolute: false), [
                'password' => 'password',
            ])
            ->assertForbidden();
    }

    public function test_user_can_cancel_a_pending_deletion_request(): void
    {
        $user = User::factory()->create([
            'is_active' => false,
            'deletion_requested_at' => now()->subDay(),
            'deletion_scheduled_for' => now()->addDays(29),
            'deletion_cancel_token' => Str::random(64),
        ]);

        $response = $this->get(route('account.cancel-deletion', $user->getRawOriginal('deletion_cancel_token'), absolute: false));

        $response
            ->assertRedirect(route('login', absolute: false))
            ->assertSessionHas('status', 'deletion-cancelled');

        $user->refresh();

        $this->assertTrue($user->is_active);
        $this->assertNull($user->deletion_requested_at);
        $this->assertNull($user->deletion_scheduled_for);
        $this->assertNull($user->getRawOriginal('deletion_cancel_token'));
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'account_deletion_cancelled',
            'category' => 'security',
            'user_id' => $user->id,
        ]);
    }

    public function test_admin_reactivation_clears_pending_deletion_state(): void
    {
        $superAdmin = User::factory()->create([
            'is_active' => true,
        ]);
        $superAdmin->assignRole('super-admin');

        $user = User::factory()->create([
            'is_active' => false,
            'deletion_requested_at' => now()->subDay(),
            'deletion_scheduled_for' => now()->addDays(29),
            'deletion_cancel_token' => Str::random(64),
        ]);

        $this->actingAs($superAdmin)
            ->patch(route('admin.users.activate', $user, absolute: false))
            ->assertRedirect();

        $user->refresh();

        $this->assertTrue($user->is_active);
        $this->assertNull($user->deletion_requested_at);
        $this->assertNull($user->deletion_scheduled_for);
        $this->assertNull($user->getRawOriginal('deletion_cancel_token'));
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user_activated',
            'category' => 'audit',
            'user_id' => $superAdmin->id,
        ]);
    }

    public function test_purge_command_anonymizes_the_user_and_deletes_related_files(): void
    {
        $user = User::factory()->create([
            'name' => 'Delete Me',
            'email' => 'delete-me@example.com',
            'avatar_path' => 'avatars/purge-avatar.jpg',
            'is_active' => false,
            'deletion_requested_at' => now()->subDays(31),
            'deletion_scheduled_for' => now()->subMinute(),
            'deletion_cancel_token' => Str::random(64),
        ]);

        File::put(storage_path('app/public/avatars/purge-avatar.jpg'), 'avatar');

        $document = Document::query()->create([
            'user_id' => $user->id,
            'original_name' => 'report.pdf',
            'encrypted_name' => 'purge-current.enc',
            'mime_type' => 'application/pdf',
            'file_size' => 2048,
            'file_hash' => hash('sha256', 'current'),
            'encryption_iv' => base64_encode(random_bytes(16)),
            'description' => null,
            'current_version' => 1,
            'scan_result' => 'clean',
        ]);

        DocumentVersion::query()->create([
            'document_id' => $document->id,
            'version_number' => 1,
            'original_name' => 'report-v1.pdf',
            'encrypted_name' => 'purge-version.enc',
            'mime_type' => 'application/pdf',
            'file_size' => 1024,
            'encryption_iv' => base64_encode(random_bytes(16)),
            'file_hash' => hash('sha256', 'version'),
            'uploaded_by' => $user->id,
            'created_at' => now()->subDay(),
        ]);

        File::put(storage_path('app/vault/purge-current.enc'), 'current-file');
        File::put(storage_path('app/vault/purge-version.enc'), 'version-file');

        $export = DataExport::query()->create([
            'user_id' => $user->id,
            'token' => str_repeat('d', 64),
            'file_path' => 'exports/purge-export.zip',
            'status' => 'ready',
            'expires_at' => now()->addHour(),
        ]);

        File::put(storage_path('app/exports/purge-export.zip'), 'zip');

        DB::table(config('session.table', 'sessions'))->insert([
            'id' => 'purge-session',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'PHPUnit',
            'payload' => 'test',
            'last_activity' => now()->timestamp,
        ]);

        $this->actingAs($user);
        app(AuditService::class)->log('profile_updated');
        auth()->logout();

        $this->artisan('securevault:purge-deletions')
            ->expectsOutput('Purged 1 scheduled account(s).')
            ->assertExitCode(0);

        $user->refresh();

        $this->assertSame('[Deleted User]', $user->name);
        $this->assertSame("deleted-user-{$user->id}@securevault.invalid", $user->email);
        $this->assertFalse($user->is_active);
        $this->assertNull($user->avatar_path);
        $this->assertNull($user->deletion_requested_at);
        $this->assertNull($user->deletion_scheduled_for);
        $this->assertNull($user->getRawOriginal('deletion_cancel_token'));

        $this->assertDatabaseMissing('documents', ['id' => $document->id]);
        $this->assertDatabaseMissing('document_versions', ['encrypted_name' => 'purge-version.enc']);
        $this->assertDatabaseMissing('data_exports', ['id' => $export->id]);
        $this->assertDatabaseMissing(config('session.table', 'sessions'), ['id' => 'purge-session']);

        $this->assertFileDoesNotExist(storage_path('app/vault/purge-current.enc'));
        $this->assertFileDoesNotExist(storage_path('app/vault/purge-version.enc'));
        $this->assertFileDoesNotExist(storage_path('app/exports/purge-export.zip'));
        $this->assertFileDoesNotExist(storage_path('app/public/avatars/purge-avatar.jpg'));

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'profile_updated',
            'user_id' => null,
        ]);
        $this->assertDatabaseMissing('audit_logs', [
            'action' => 'profile_updated',
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'account_deletion_executed',
            'category' => 'security',
            'user_id' => null,
        ]);
    }
}
