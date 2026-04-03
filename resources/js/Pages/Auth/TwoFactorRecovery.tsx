import GuestLayout from '@/Layouts/GuestLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, KeyRound, Loader2 } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function TwoFactorRecovery() {
    const { data, setData, post, processing, errors } = useForm({
        recovery_code: '',
    });

    const handleSubmit: FormEventHandler = (event) => {
        event.preventDefault();

        post(route('two-factor.recovery.verify'));
    };

    return (
        <GuestLayout>
            <Head title="Recovery Code" />

            <Card className="mx-4 w-full max-w-sm rounded-2xl shadow-sm">
                <CardContent className="flex flex-col items-center gap-6 px-8 py-10 text-center">
                    <div className="rounded-2xl bg-primary/15 p-4">
                        <KeyRound className="h-10 w-10 text-primary" />
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-foreground">Recovery Code</h2>
                        <p className="typewriter mt-1 overflow-hidden whitespace-nowrap border-r-2 border-primary text-sm text-muted-foreground">
                            Enter one of your saved recovery codes to access your account.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="recovery_code">Recovery Code</Label>
                            <Input
                                id="recovery_code"
                                value={data.recovery_code}
                                onChange={(event) => setData('recovery_code', event.target.value.toUpperCase())}
                                placeholder="XXXX-XXXX"
                                autoCapitalize="characters"
                                autoCorrect="off"
                                autoComplete="one-time-code"
                                className="text-center font-mono text-lg tracking-[0.2em]"
                                autoFocus
                            />
                        </div>

                        {errors.recovery_code && (
                            <Alert variant="destructive" className="text-left">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{errors.recovery_code}</AlertDescription>
                            </Alert>
                        )}

                        <Button
                            className="w-full bg-primary text-primary-foreground"
                            disabled={processing || data.recovery_code.trim() === ''}
                            type="submit"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify Recovery Code'
                            )}
                        </Button>
                    </form>

                    <div className="space-y-2 text-sm">
                        <Link href={route('two-factor.challenge')} className="text-primary underline underline-offset-4">
                            Back to authenticator code
                        </Link>
                        <div>
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="text-muted-foreground hover:underline"
                            >
                                Use a different account
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
