import PasswordStrengthBar from '@/components/PasswordStrengthBar';
import GuestLayout from '@/Layouts/GuestLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldAlert } from 'lucide-react';
import { FormEvent, useState } from 'react';

export default function PasswordExpired({ expiryDays }: { expiryDays: number }) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        patch(route('password.expired.update'), {
            onFinish: () => reset('current_password', 'password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Password Expired" />

            <Card className="mx-4 w-full max-w-md rounded-2xl border-t-4 border-t-amber-500 shadow-sm">
                <CardContent className="space-y-6 px-8 py-10">
                    <div className="flex justify-center">
                        <div className="relative rounded-2xl bg-amber-500/15 p-4">
                            <LockKeyhole className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                            <ShieldAlert className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background text-destructive" />
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-foreground">Password Expired</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Your password is more than {expiryDays} day{expiryDays === 1 ? '' : 's'} old. Please set a
                            new password to continue.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="current_password">Current Password</Label>
                            <div className="relative">
                                <Input
                                    id="current_password"
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={data.current_password}
                                    className="pr-10"
                                    autoComplete="current-password"
                                    autoFocus
                                    onChange={(event) => setData('current_password', event.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                                    aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                                >
                                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            {errors.current_password && (
                                <p className="text-sm text-destructive">{errors.current_password}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    className="pr-10"
                                    autoComplete="new-password"
                                    onChange={(event) => setData('password', event.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? 'Hide new password' : 'Show new password'}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            {data.password && <PasswordStrengthBar password={data.password} />}
                            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="password_confirmation">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password_confirmation"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={data.password_confirmation}
                                    className="pr-10"
                                    autoComplete="new-password"
                                    onChange={(event) => setData('password_confirmation', event.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    aria-label={
                                        showConfirmPassword
                                            ? 'Hide confirmation password'
                                            : 'Show confirmation password'
                                    }
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                            {errors.password_confirmation && (
                                <p className="text-sm text-destructive">{errors.password_confirmation}</p>
                            )}
                        </div>

                        <Button className="w-full bg-primary text-primary-foreground" disabled={processing} type="submit">
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                'Update Password'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
