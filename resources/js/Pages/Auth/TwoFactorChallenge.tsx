import InputError from '@/components/InputError';
import InputLabel from '@/components/InputLabel';
import PrimaryButton from '@/components/PrimaryButton';
import TextInput from '@/components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function TwoFactorChallenge() {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('two-factor.verify'));
    };

    return (
        <GuestLayout>
            <Head title="Two-Factor Verification" />

            <div className="mb-4 text-sm text-gray-600">
                Please confirm access to your account by entering the authentication code provided by your authenticator application.
            </div>

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="code" value="Code" />

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

                <div className="mt-6 flex items-center justify-end">
                    <PrimaryButton className="w-full justify-center" disabled={processing}>
                        Log In
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
