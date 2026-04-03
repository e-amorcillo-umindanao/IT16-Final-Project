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

        for ($index = 0; $index < self::CODE_COUNT; $index++) {
            $code = Str::upper(Str::random(4)).'-'.Str::upper(Str::random(4));
            $codes[] = $code;

            TwoFactorRecoveryCode::create([
                'user_id' => $user->id,
                'code_hash' => Hash::make($code),
            ]);
        }

        return $codes;
    }

    public function consume(User $user, string $code): bool
    {
        $normalizedCode = Str::upper(trim($code));

        $records = $user->twoFactorRecoveryCodes()
            ->whereNull('used_at')
            ->get();

        foreach ($records as $record) {
            if (! Hash::check($normalizedCode, $record->code_hash)) {
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
