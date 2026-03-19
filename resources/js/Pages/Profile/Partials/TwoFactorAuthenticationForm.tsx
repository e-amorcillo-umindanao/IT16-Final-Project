import { Button } from '@/components/ui/button';
import { useForm, Link } from '@inertiajs/react';
import { ShieldCheck, ShieldOff } from 'lucide-react';

export default function TwoFactorAuthenticationForm({
    twoFactorEnabled,
    className = '',
}: {
    twoFactorEnabled: boolean;
    className?: string;
}) {
    const { delete: destroy } = useForm();

    const disableTwoFactor = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Use password confirmation route via inertia visit
        // A full implementation would pop a modal, but for simplicity
        // redirect to confirm password first before deleting
        destroy(route('two-factor.disable'));
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-foreground">
                    Two-Factor Authentication
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    Add additional security to your account using two-factor authentication.
                </p>
            </header>

            <div className="mt-6 flex items-center justify-between">
                <div>
                    {twoFactorEnabled ? (
                        <div className="flex items-center gap-2 text-sm font-medium text-[#4ADE80]">
                            <ShieldCheck className="h-5 w-5" />
                            <span>Two-Factor Authentication is Enabled</span>
                        </div>
                    ) : (
                        <div className="flex items-start gap-3 rounded-lg border border-[#3F2E11] bg-[#2A2010] px-4 py-3">
                            <ShieldOff className="mt-0.5 h-5 w-5 text-primary" />
                            <div>
                                <div className="text-sm font-medium text-primary">
                                    Two-factor authentication is not enabled
                                </div>
                                <p className="mt-1 text-sm text-[#C9A664]">
                                    We recommend enabling 2FA for additional account security.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    {twoFactorEnabled ? (
                        <form onSubmit={disableTwoFactor}>
                            <Button variant="destructive" type="submit">
                                Disable 2FA
                            </Button>
                        </form>
                    ) : (
                        <Link href={route('two-factor.setup')}>
                            <Button>Enable 2FA</Button>
                        </Link>
                    )}
                </div>
            </div>
        </section>
    );
}
