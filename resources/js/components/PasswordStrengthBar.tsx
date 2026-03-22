import { Progress } from '@/components/ui/progress';

const getStrength = (pwd: string): number => {
    const checks = [
        pwd.length >= 8,
        /[A-Z]/.test(pwd),
        /[a-z]/.test(pwd),
        /[0-9]/.test(pwd),
        /[@$!%*?&#^()_+]/.test(pwd),
    ];

    return checks.filter(Boolean).length;
};

export default function PasswordStrengthBar({
    password,
}: {
    password: string;
}) {
    const strength = getStrength(password);

    return (
        <div className="mt-1 space-y-1">
            <Progress
                value={(strength / 5) * 100}
                className={`h-1 ${
                    strength <= 2
                        ? '[&>div]:bg-destructive'
                        : strength === 3
                          ? '[&>div]:bg-amber-500'
                          : '[&>div]:bg-green-500'
                }`}
            />
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                    Min. 8 chars · Uppercase · Lowercase · Number · Special
                    character
                </p>
                <span
                    className={`shrink-0 text-xs font-medium ${
                        strength <= 2
                            ? 'text-destructive'
                            : strength === 3
                              ? 'text-amber-500'
                              : 'text-green-500'
                    }`}
                >
                    {strength <= 2 ? 'Weak' : strength === 3 ? 'Fair' : 'Strong'}
                </span>
            </div>
        </div>
    );
}
