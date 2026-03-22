import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const;

interface VaultLockProps {
    userEmail: string;
}

export default function VaultLock({ userEmail }: VaultLockProps) {
    const [locked, setLocked] = useState(false);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const armTimer = useCallback(() => {
        clearTimer();
        timerRef.current = setTimeout(() => {
            setLocked(true);
        }, IDLE_TIMEOUT);
    }, [clearTimer]);

    const resetTimer = useCallback(() => {
        if (!locked) {
            armTimer();
        }
    }, [armTimer, locked]);

    useEffect(() => {
        const onVisibilityChange = () => {
            if (!document.hidden) {
                resetTimer();
            }
        };

        EVENTS.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));
        document.addEventListener('visibilitychange', onVisibilityChange);
        armTimer();

        return () => {
            EVENTS.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
            document.removeEventListener('visibilitychange', onVisibilityChange);
            clearTimer();
        };
    }, [armTimer, clearTimer, resetTimer]);

    const handleUnlock = async () => {
        if (!password) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const csrfToken = document
                .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.getAttribute('content') ?? '';

            const response = await fetch(route('vault.unlock'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ password }),
            });

            if (!response.ok) {
                throw new Error('Unlock failed');
            }

            setLocked(false);
            setPassword('');
            setShowPassword(false);
            armTimer();
        } catch {
            setError('Incorrect password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!locked) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/92 px-4 backdrop-blur-md">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="h-1.5 bg-primary" />
                <div className="space-y-6 px-8 py-10 text-center">
                    <div className="flex justify-center">
                        <div className="rounded-2xl bg-primary/15 p-4">
                            <Lock className="h-10 w-10 text-primary" />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-foreground">Vault Locked</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your session is still active. Enter your password to continue.
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">{userEmail}</p>
                    </div>

                    <div className="space-y-2 text-left">
                        <Label htmlFor="vault-unlock-password">Password</Label>
                        <div className="relative">
                            <Input
                                id="vault-unlock-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        void handleUnlock();
                                    }
                                }}
                                className="h-11 pr-10"
                                autoFocus
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                onClick={() => setShowPassword((current) => !current)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>

                    <Button
                        className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={loading || !password}
                        onClick={() => void handleUnlock()}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            'Unlock Vault'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
