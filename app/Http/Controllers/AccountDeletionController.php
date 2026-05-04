<?php

namespace App\Http\Controllers;

use App\Mail\AccountDeletionRequestedMail;
use App\Models\User;
use App\Services\AuditService;
use App\Services\RecoveryCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;
use RuntimeException;
use Throwable;

class AccountDeletionController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
        private readonly Google2FA $google2fa,
        private readonly RecoveryCodeService $recoveryCodeService,
    ) {}

    public function request(Request $request): RedirectResponse
    {
        $user = $request->user();

        abort_if($user->hasRole('super-admin'), 403, 'Super Admin accounts cannot be self-deleted.');
        abort_if($user->isSystemAccount(), 403, 'System accounts cannot be deleted through this flow.');

        if ($user->deletion_requested_at !== null) {
            return back()->withErrors([
                'delete' => 'A deletion request is already pending.',
            ]);
        }

        $request->validate([
            'password' => ['required', 'current_password'],
            'two_factor_code' => ['nullable', 'string'],
        ]);

        $submittedCode = null;
        $consumeRecoveryCode = false;

        if ($user->two_factor_enabled) {
            $submittedCode = trim((string) $request->input('two_factor_code', ''));

            if ($submittedCode === '') {
                return back()->withErrors([
                    'two_factor_code' => 'A 2FA code or recovery code is required.',
                ]);
            }

            $validTotp = $this->google2fa->verifyKey($user->two_factor_secret, $submittedCode);
            $validRecoveryCode = $this->recoveryCodeService->isValid($user, $submittedCode);

            if (! $validTotp && ! $validRecoveryCode) {
                return back()->withErrors([
                    'two_factor_code' => 'Invalid 2FA code or recovery code.',
                ]);
            }

            $consumeRecoveryCode = ! $validTotp && $validRecoveryCode;
        }

        $cancelToken = Str::random(64);
        $scheduledFor = now()->addDays(30);
        $requestedAt = now();

        try {
            Mail::to($user->email)->send(new AccountDeletionRequestedMail($user, $cancelToken, $scheduledFor));
        } catch (Throwable $exception) {
            Log::error('Account deletion request email failed before scheduling deletion.', [
                'user_id' => $user->id,
                'error' => $exception->getMessage(),
            ]);

            return back()->withErrors([
                'delete' => 'We could not process your deletion request right now. Please try again.',
            ]);
        }

        try {
            DB::transaction(function () use ($user, $cancelToken, $scheduledFor, $requestedAt, $consumeRecoveryCode, $submittedCode): void {
                if ($consumeRecoveryCode && ! $this->recoveryCodeService->consume($user, (string) $submittedCode)) {
                    throw new RuntimeException('Recovery code could not be consumed after mail delivery.');
                }

                $user->update([
                    'is_active' => false,
                    'deletion_requested_at' => $requestedAt,
                    'deletion_scheduled_for' => $scheduledFor,
                    'deletion_cancel_token' => $cancelToken,
                ]);

                DB::table(config('session.table', 'sessions'))
                    ->where('user_id', $user->id)
                    ->delete();

                $this->auditService->log('account_deletion_requested', metadata: [
                    'scheduled_for' => $scheduledFor->toDateString(),
                ]);
            });
        } catch (Throwable $exception) {
            Log::error('Account deletion scheduling failed after cancellation email was sent.', [
                'user_id' => $user->id,
                'error' => $exception->getMessage(),
            ]);

            return back()->withErrors([
                'delete' => 'We could not process your deletion request right now. Please try again.',
            ]);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('status', 'deletion-scheduled');
    }

    public function cancel(string $token): RedirectResponse
    {
        $user = User::query()
            ->where('deletion_cancel_token', $token)
            ->whereNotNull('deletion_requested_at')
            ->where('deletion_scheduled_for', '>', now())
            ->firstOrFail();

        $user->update([
            'is_active' => true,
            'deletion_requested_at' => null,
            'deletion_scheduled_for' => null,
            'deletion_cancel_token' => null,
        ]);

        $this->auditService->logForUser($user, 'account_deletion_cancelled');

        return redirect()->route('login')->with('status', 'deletion-cancelled');
    }
}
