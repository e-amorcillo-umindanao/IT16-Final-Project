import GuestLayout from '@/Layouts/GuestLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Head, Link, useForm } from '@inertiajs/react';
import { CheckCircle, Loader2, Mail } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <GuestLayout>
            <Head title="Email Verification" />

            <Card className="mx-4 w-full max-w-md rounded-2xl shadow-sm">
                <CardContent className="space-y-6 px-8 py-10 text-center">
                    <div className="flex justify-center">
                        <div className="rounded-2xl bg-primary/15 p-4">
                            <Mail className="h-10 w-10 text-primary" />
                        </div>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-foreground">
                            Verify Your Email
                        </h2>
                        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                            We&apos;ve sent a verification link to your email
                            address. Please check your inbox and click the link
                            to continue.
                        </p>
                    </div>

                    {status === 'verification-link-sent' && (
                        <Alert className="border-green-500/20 bg-green-500/5 text-left">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <AlertDescription className="text-green-700 dark:text-green-400">
                                A new verification link has been sent to your
                                email address.
                            </AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={submit} className="space-y-3">
                        <Button
                            className="w-full bg-primary text-primary-foreground"
                            disabled={processing}
                            type="submit"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Resend Verification Email'
                            )}
                        </Button>

                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="w-full"
                        >
                            <Button
                                variant="ghost"
                                className="w-full text-muted-foreground"
                                type="button"
                            >
                                Log Out
                            </Button>
                        </Link>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
