import GuestLayout from '@/Layouts/GuestLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';

export default function TwoFactorChallenge() {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    const submit = () => {
        post(route('two-factor.verify'));
    };

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        submit();
    };

    useEffect(() => {
        if (data.code.length === 6 && !processing) {
            submit();
        }
    }, [data.code, processing]);

    return (
        <GuestLayout>
            <Head title="Two-Factor Verification" />

            <Card className="mx-4 w-full max-w-sm rounded-2xl shadow-sm">
                <CardContent className="flex flex-col items-center gap-6 px-8 py-10 text-center">
                    <div className="rounded-2xl bg-primary/15 p-4">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-foreground">
                            Two-Factor Authentication
                        </h2>
                        <p className="typewriter mt-1 overflow-hidden whitespace-nowrap border-r-2 border-primary text-sm text-muted-foreground">
                            Enter the 6-digit code from your authenticator app.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                        <div className="flex justify-center">
                            <InputOTP
                                id="code"
                                name="code"
                                maxLength={6}
                                autoComplete="one-time-code"
                                pattern="^[0-9]*$"
                                inputMode="numeric"
                                value={data.code}
                                onChange={(value) => setData('code', value)}
                            >
                                <InputOTPGroup>
                                    <InputOTPSlot
                                        index={0}
                                        className="h-12 w-12 text-lg font-semibold"
                                    />
                                    <InputOTPSlot
                                        index={1}
                                        className="h-12 w-12 text-lg font-semibold"
                                    />
                                    <InputOTPSlot
                                        index={2}
                                        className="h-12 w-12 text-lg font-semibold"
                                    />
                                    <InputOTPSlot
                                        index={3}
                                        className="h-12 w-12 text-lg font-semibold"
                                    />
                                    <InputOTPSlot
                                        index={4}
                                        className="h-12 w-12 text-lg font-semibold"
                                    />
                                    <InputOTPSlot
                                        index={5}
                                        className="h-12 w-12 text-lg font-semibold"
                                    />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>

                        {errors.code && (
                            <Alert variant="destructive" className="text-left">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{errors.code}</AlertDescription>
                            </Alert>
                        )}

                        <Button
                            className="w-full bg-primary text-primary-foreground"
                            disabled={processing || data.code.length < 6}
                            type="submit"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify Code'
                            )}
                        </Button>
                    </form>

                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm text-muted-foreground hover:underline"
                    >
                        Use a different account
                    </Link>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
