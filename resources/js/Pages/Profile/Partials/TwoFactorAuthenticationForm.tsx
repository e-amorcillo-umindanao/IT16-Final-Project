import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useForm, Link } from '@inertiajs/react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

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
                <h2 className="text-lg font-medium text-gray-900">
                    Two-Factor Authentication
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    Add additional security to your account using two-factor authentication.
                </p>
            </header>

            <div className="mt-6 flex items-center justify-between">
                <div>
                    {twoFactorEnabled ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                            <ShieldCheck className="h-5 w-5" />
                            <span>Two-Factor Authentication is Enabled</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-amber-600 font-medium">
                            <ShieldAlert className="h-5 w-5" />
                            <span>Two-Factor Authentication is Disabled</span>
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
