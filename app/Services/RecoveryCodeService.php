<?php

namespace App\Services;

use App\Models\TwoFactorRecoveryCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RecoveryCodeService
{
    public const CODE_COUNT = 8;

    public function generate(User $user): array
    {
        $user->twoFactorRecoveryCodes()->delete();

        $codes = [];
        $bcryptHasher = Hash::driver('bcrypt');

        for ($index = 0; $index < self::CODE_COUNT; $index++) {
            $code = Str::upper(Str::random(4)).'-'.Str::upper(Str::random(4));
            $codes[] = $code;

            TwoFactorRecoveryCode::create([
                'user_id' => $user->id,
                'code_hash' => $bcryptHasher->make($code),
            ]);
        }

        return $codes;
    }

    public function isValid(User $user, string $code): bool
    {
        $normalizedCode = Str::upper(trim($code));
        $bcryptHasher = Hash::driver('bcrypt');

        return $user->twoFactorRecoveryCodes()
            ->whereNull('used_at')
            ->get()
            ->contains(fn (TwoFactorRecoveryCode $record): bool => $bcryptHasher->check($normalizedCode, $record->code_hash));
    }

    public function consume(User $user, string $code): bool
    {
        $normalizedCode = Str::upper(trim($code));
        $bcryptHasher = Hash::driver('bcrypt');

        $records = $user->twoFactorRecoveryCodes()
            ->whereNull('used_at')
            ->get();

        foreach ($records as $record) {
            if (! $bcryptHasher->check($normalizedCode, $record->code_hash)) {
                continue;
            }

            $record->update([
                'used_at' => now(),
            ]);

            return true;
        }

        return false;
    }

    public function remainingCount(User $user): int
    {
        return $user->twoFactorRecoveryCodes()
            ->whereNull('used_at')
            ->count();
    }
}
