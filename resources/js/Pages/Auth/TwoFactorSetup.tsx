import InputError from '@/components/InputError';
import InputLabel from '@/components/InputLabel';
import PrimaryButton from '@/components/PrimaryButton';
import TextInput from '@/components/TextInput';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function TwoFactorSetup({
    qrCodeUrl,
    secret,
}: {
    qrCodeUrl: string;
    secret: string;
}) {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('two-factor.enable'));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Two-Factor Authentication Setup
                </h2>
            }
        >
            <Head title="Two-Factor Setup" />

            <div className="py-12">
                <div className="mx-auto max-w-2xl sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white p-6 shadow-sm sm:rounded-lg">
                        <div className="mb-6 border-b pb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                Secure Your Account
                            </h3>
                            <p className="mt-1 text-sm text-gray-600">
                                Scan the QR code below with your authenticator app (like Google Authenticator or Authy).
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center space-y-6">
                            <div className="rounded-lg bg-white p-4 shadow-sm border">
                                <img src={qrCodeUrl} alt="2FA QR Code" className="h-64 w-64" />
                            </div>

                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-700">Manual Entry Key:</p>
                                <code className="mt-2 block rounded bg-gray-100 px-3 py-1 font-mono text-lg text-gray-900">
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
