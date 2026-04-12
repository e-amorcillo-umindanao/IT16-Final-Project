import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import InputError from '@/components/InputError';
import InputLabel from '@/components/InputLabel';
import PrimaryButton from '@/components/PrimaryButton';
import TextInput from '@/components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { ShieldAlert } from 'lucide-react';
import QRCode from 'qrcode';
import { FormEventHandler, useEffect, useState } from 'react';

export default function TwoFactorSetup({
    otpauthUrl,
    secret,
    required = false,
    hoursRemaining = null,
}: {
    otpauthUrl: string;
    secret: string;
    required?: boolean;
    hoursRemaining?: number | null;
}) {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });
    const [qrDataUrl, setQrDataUrl] = useState('');

    useEffect(() => {
        if (!otpauthUrl) {
            setQrDataUrl('');
            return;
        }

        QRCode.toDataURL(otpauthUrl, {
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        })
            .then(setQrDataUrl)
            .catch(() => setQrDataUrl(''));
    }, [otpauthUrl]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('two-factor.enable'));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-foreground">
                    Two-Factor Authentication Setup
                </h2>
            }
        >
            <Head title="Two-Factor Setup" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="noir-card-glow overflow-hidden rounded-lg border border-border bg-card p-6">
                        <div className="mb-6 border-b border-border pb-4">
                            <h3 className="text-lg font-medium text-foreground">
                                Secure Your Account
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Scan the QR code below with your authenticator app (like Google Authenticator or Authy).
                            </p>
                        </div>

                        {(required || hoursRemaining !== null) && (
                            <Alert className={required
                                ? 'mb-6 border-destructive/30 bg-destructive/10 text-destructive'
                                : 'mb-6 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'}
                            >
                                <ShieldAlert className="h-4 w-4" />
                                <AlertTitle>
                                    {required ? 'Two-factor authentication required' : 'Two-factor setup deadline'}
                                </AlertTitle>
                                <AlertDescription>
                                    {required
                                        ? 'Your 3-day grace period has expired. Enable 2FA before accessing the rest of SecureVault.'
                                        : `Enable 2FA within the next ${hoursRemaining ?? 0} hour${hoursRemaining === 1 ? '' : 's'} to avoid access restrictions.`}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="flex flex-col items-center justify-center space-y-6">
                            {qrDataUrl ? (
                                <div className="inline-block rounded-lg border border-border bg-white p-3 shadow-sm">
                                    <img
                                        src={qrDataUrl}
                                        alt="Scan this QR code with your authenticator app"
                                        width={200}
                                        height={200}
                                        className="block"
                                    />
                                </div>
                            ) : (
                                <div className="inline-flex h-[224px] w-[224px] items-center justify-center rounded-lg border border-border bg-white p-3 shadow-sm">
                                    <span className="text-xs text-muted-foreground">Generating...</span>
                                </div>
                            )}

                            <div className="text-center">
                                <p className="text-sm font-medium text-muted-foreground">Manual Entry Key:</p>
                                <code className="mt-2 block rounded border border-border bg-muted px-3 py-1 font-mono text-lg text-foreground">
                                    {secret}
                                </code>
                            </div>

                            <form onSubmit={submit} className="w-full max-w-sm">
                                <div>
                                    <InputLabel htmlFor="code" value="Verification Code" />

                                    <TextInput
                                        id="code"
                                        type="text"
                                        name="code"
                                        value={data.code}
                                        className="mt-1 block w-full text-center tracking-[0.5em] font-bold text-2xl"
                                        autoComplete="one-time-code"
                                        isFocused={true}
                                        onChange={(e) => setData('code', e.target.value)}
                                        maxLength={6}
                                        placeholder="000000"
                                    />

                                    <InputError message={errors.code} className="mt-2" />
                                </div>

                                <div className="mt-6 flex justify-center">
                                    <PrimaryButton className="w-full justify-center py-3" disabled={processing}>
                                        Enable Two-Factor Authentication
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
