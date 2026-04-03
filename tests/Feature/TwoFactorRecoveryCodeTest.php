<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\TwoFactorRecoveryCode;
use App\Models\User;
use App\Services\RecoveryCodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorRecoveryCodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_enabling_two_factor_generates_and_flashes_recovery_codes(): void
    {
        $user = User::factory()->create();
        $secret = 'ABCDEFGHIJKLMNOP';
        $code = app(Google2FA::class)->getCurrentOtp($secret);

        $response = $this
            ->actingAs($user)
            ->withSession(['2fa_setup_secret' => $secret])
            ->post(route('two-factor.enable'), [
                'code' => $code,
            ]);

        $response
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHas('recovery_codes', fn (mixed $codes) => is_array($codes) && count($codes) === 8);

        $user->refresh();
        $storedCodes = TwoFactorRecoveryCode::query()
            ->where('user_id', $user->id)
            ->get();
        $flashedCodes = session('recovery_codes');

        $this->assertTrue($user->two_factor_enabled);
        $this->assertSame($secret, $user->two_factor_secret);
        $this->assertCount(8, $storedCodes);
        $this->assertIsArray($flashedCodes);
        $this->assertCount(8, $flashedCodes);
        $this->assertTrue(Hash::check($flashedCodes[0], $storedCodes->first()->code_hash));
        $this->assertFalse(collect($flashedCodes)->contains($storedCodes->first()->code_hash));
    }

    public function test_recovery_page_is_accessible_while_two_factor_is_pending(): void
    {
        $user = User::factory()->create([
            'two_factor_enabled' => true,
            'two_factor_secret' => 'ABCDEFGHIJKLMNOP',
        ]);

        $this->actingAs($user)
            ->get(route('two-factor.recovery'))
            ->assertOk();
    }

    public function test_valid_recovery_code_marks_the_code_used_and_verifies_the_session(): void
    {
        $user = User::factory()->create([
            'two_factor_enabled' => true,
            'two_factor_secret' => 'ABCDEFGHIJKLMNOP',
        ]);
        $codes = app(RecoveryCodeService::class)->generate($user);

        $response = $this
            ->actingAs($user)
            ->post(route('two-factor.recovery.verify'), [
                'recovery_code' => $codes[0],
            ]);

        $response
            ->assertRedirect(route('dashboard'))
            ->assertSessionHas('2fa_verified', true);

        $this->assertDatabaseHas('two_factor_recovery_codes', [
            'user_id' => $user->id,
        ]);
        $this->assertSame(7, app(RecoveryCodeService::class)->remainingCount($user->fresh()));

        $usedCode = TwoFactorRecoveryCode::query()
            ->where('user_id', $user->id)
            ->whereNotNull('used_at')
            ->first();

        $this->assertNotNull($usedCode);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'recovery_code_used',
            'user_id' => $user->id,
            'category' => 'security',
        ]);
    }

    public function test_used_recovery_code_cannot_be_reused(): void
    {
        $user = User::factory()->create([
            'two_factor_enabled' => true,
            'two_factor_secret' => 'ABCDEFGHIJKLMNOP',
        ]);
        $codes = app(RecoveryCodeService::class)->generate($user);

        $this->actingAs($user)
            ->post(route('two-factor.recovery.verify'), [
                'recovery_code' => $codes[0],
            ])
            ->assertRedirect(route('dashboard'));

        $this->actingAs($user)
            ->withSession(['2fa_verified' => false])
            ->from(route('two-factor.recovery'))
            ->post(route('two-factor.recovery.verify'), [
                'recovery_code' => $codes[0],
            ])
            ->assertRedirect(route('two-factor.recovery'))
            ->assertSessionHasErrors('recovery_code');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'recovery_code_failed',
            'user_id' => $user->id,
            'category' => 'security',
        ]);
    }

    public function test_regenerating_recovery_codes_replaces_existing_codes(): void
    {
        $user = User::factory()->create([
            'two_factor_enabled' => true,
            'two_factor_secret' => 'ABCDEFGHIJKLMNOP',
        ]);

        app(RecoveryCodeService::class)->generate($user);
        $originalIds = TwoFactorRecoveryCode::query()
            ->where('user_id', $user->id)
            ->pluck('id')
            ->all();

        $response = $this
            ->actingAs($user)
            ->withSession(['2fa_verified' => true])
            ->post(route('two-factor.recovery-codes.regenerate'));

        $response
            ->assertRedirect(route('profile.edit'))
            ->assertSessionHas('recovery_codes', fn (mixed $codes) => is_array($codes) && count($codes) === 8);

        $newIds = TwoFactorRecoveryCode::query()
            ->where('user_id', $user->id)
            ->pluck('id')
            ->all();

        $this->assertCount(8, $newIds);
        $this->assertNotSame($originalIds, $newIds);

        $log = AuditLog::query()
            ->latest('id')
            ->first();

        $this->assertSame('recovery_codes_regenerated', $log?->action);
    }
}
