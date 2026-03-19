import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import TwoFactorAuthenticationForm from './Partials/TwoFactorAuthenticationForm';
import ActiveSessionsForm from './Partials/ActiveSessionsForm';

export default function Edit({
    mustVerifyEmail,
    status,
    twoFactorEnabled,
    sessionCount,
}: PageProps<{
    mustVerifyEmail: boolean;
    status?: string;
    twoFactorEnabled: boolean;
    sessionCount: number;
}>) {
    return (
        <AuthenticatedLayout
            header={
                <div>
                    <h2 className="text-xl font-semibold leading-tight text-foreground">
                        Profile
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage your account settings and security preferences
                    </p>
                </div>
            }
        >
            <Head title="Profile" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="noir-card-glow rounded-lg border border-border bg-card p-6 sm:p-8">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="noir-card-glow rounded-lg border border-border bg-card p-6 sm:p-8">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="noir-card-glow rounded-lg border border-border bg-card p-6 sm:p-8">
                        <TwoFactorAuthenticationForm
                            twoFactorEnabled={twoFactorEnabled}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="noir-card-glow rounded-lg border border-border bg-card p-6 sm:p-8">
                        <ActiveSessionsForm
                            sessionCount={sessionCount}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="rounded-lg border border-[#5A2020] bg-[#2D1010] p-6 sm:p-8">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
