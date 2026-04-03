import InputError from '@/components/InputError';
import PasswordStrengthBar from '@/components/PasswordStrengthBar';
import UserAvatar from '@/components/UserAvatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    Camera,
    ChevronRight,
    Copy,
    Download,
    KeyRound,
    Loader2,
    Monitor,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    User,
} from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type RecentSession = {
    id: string;
    ip_address: string | null;
    last_activity: number;
    is_current: boolean;
};

type Props = PageProps<{
    mustVerifyEmail: boolean;
    status?: string;
    has_pending_export: boolean;
    latest_export: {
        status: 'pending' | 'ready' | 'downloaded' | 'expired';
        expires_at: string | null;
        download_url: string | null;
    } | null;
    two_factor_enabled: boolean;
    recovery_codes_remaining: number;
    session_count: number;
    recent_sessions: RecentSession[];
}>;

function formatSessionActivity(unixTimestamp: number) {
    return formatDistanceToNow(new Date(unixTimestamp * 1000), {
        addSuffix: true,
    });
}

export default function Edit({
    auth,
    status,
    has_pending_export,
    latest_export,
    two_factor_enabled,
    recovery_codes_remaining,
    session_count,
    recent_sessions,
}: Props) {
    const page = usePage<Props>();
    const profileForm = useForm({
        name: auth.user.name,
        email: auth.user.email,
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const deleteAccountForm = useForm({
        password: '',
        two_factor_code: '',
    });
    const exportRequestForm = useForm({});
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
    const [avatarUploadProgress, setAvatarUploadProgress] = useState<number | null>(null);
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [isAvatarRemoving, setIsAvatarRemoving] = useState(false);
    const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const flashedRecoveryCodes = page.props.flash?.recovery_codes ?? null;
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>(flashedRecoveryCodes ?? []);
    const [recoveryDialogOpen, setRecoveryDialogOpen] = useState((flashedRecoveryCodes?.length ?? 0) > 0);

    const currentAvatarUrl = auth.user.avatar_url ?? null;
    const displayedAvatarUrl = avatarPreviewUrl ?? currentAvatarUrl;
    const hasCustomAvatar = Boolean(currentAvatarUrl);
    const isAvatarBusy = isAvatarUploading || isAvatarRemoving;
    const isSuperAdmin = auth.roles?.includes('super-admin') ?? false;
    const exportRequestError = (exportRequestForm.errors as Record<string, string | undefined>).export;
    const deleteAccountError = (deleteAccountForm.errors as Record<string, string | undefined>).delete;
    const latestExportReady = latest_export?.status === 'ready' && Boolean(latest_export.download_url);
    const latestExportPending = latest_export?.status === 'pending';
    const passwordConfirmationError =
        passwordForm.errors.password_confirmation ||
        (passwordForm.errors.password?.toLowerCase().includes('confirmation')
            ? passwordForm.errors.password
            : undefined);
    const passwordFieldError =
        passwordForm.errors.password &&
        !passwordForm.errors.password.toLowerCase().includes('confirmation')
            ? passwordForm.errors.password
            : undefined;

    useEffect(() => {
        return () => {
            if (avatarPreviewUrl) {
                URL.revokeObjectURL(avatarPreviewUrl);
            }
        };
    }, [avatarPreviewUrl]);

    useEffect(() => {
        if ((flashedRecoveryCodes?.length ?? 0) === 0) {
            return;
        }

        setRecoveryCodes(flashedRecoveryCodes ?? []);
        setRecoveryDialogOpen(true);
    }, [flashedRecoveryCodes]);

    useEffect(() => {
        if (status === 'export-requested') {
            toast.success('Export requested. A download button will appear here when it is ready.');
        }
    }, [status]);

    const replaceAvatarPreview = (nextUrl: string | null) => {
        setAvatarPreviewUrl((currentUrl) => {
            if (currentUrl) {
                URL.revokeObjectURL(currentUrl);
            }

            return nextUrl;
        });
    };

    const submitProfile = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        profileForm.patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Profile updated successfully.');
            },
        });
    };

    const submitPassword = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        passwordForm.put(route('profile.password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                passwordForm.reset();
                toast.success('Password updated successfully.');
            },
        });
    };

    const triggerAvatarFilePicker = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        replaceAvatarPreview(URL.createObjectURL(file));
        setAvatarError(null);
        setIsAvatarUploading(true);
        setAvatarUploadProgress(0);

        router.post(
            route('profile.avatar.update'),
            {
                _method: 'put',
                avatar: file,
            },
            {
                forceFormData: true,
                preserveScroll: true,
                onProgress: (progress) => {
                    setAvatarUploadProgress(progress?.percentage ?? 0);
                },
                onSuccess: () => {
                    replaceAvatarPreview(null);
                    setAvatarError(null);
                },
                onError: (errors) => {
                    setAvatarError(typeof errors.avatar === 'string' ? errors.avatar : null);
                },
                onFinish: () => {
                    setIsAvatarUploading(false);
                    setAvatarUploadProgress(null);

                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                },
            },
        );
    };

    const removeAvatar = () => {
        setAvatarError(null);
        setIsAvatarRemoving(true);

        router.delete(route('profile.avatar.destroy'), {
            preserveScroll: true,
            onSuccess: () => {
                replaceAvatarPreview(null);
            },
            onFinish: () => {
                setIsAvatarRemoving(false);
            },
        });
    };

    const disableTwoFactor = () => {
        router.delete(route('two-factor.destroy'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Two-factor authentication disabled.');
            },
        });
    };

    const regenerateRecoveryCodes = () => {
        router.post(
            route('two-factor.recovery-codes.regenerate'),
            {},
            {
                preserveScroll: true,
            },
        );
    };

    const requestDataExport = () => {
        exportRequestForm.post(route('profile.export.request'), {
            preserveScroll: true,
        });
    };

    const closeDeletionDialog = () => {
        setDeletionDialogOpen(false);
        deleteAccountForm.clearErrors();
        deleteAccountForm.reset();
    };

    const submitDeletionRequest = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        deleteAccountForm.post(route('profile.delete-account'), {
            preserveScroll: true,
        });
    };

    const closeRecoveryDialog = () => {
        setRecoveryDialogOpen(false);
        setRecoveryCodes([]);
    };

    const copyRecoveryCodes = async () => {
        if (recoveryCodes.length === 0) {
            return;
        }

        await navigator.clipboard.writeText(recoveryCodes.join('\n'));
        toast.success('Recovery codes copied.');
    };

    const downloadRecoveryCodes = () => {
        if (recoveryCodes.length === 0) {
            return;
        }

        const blob = new Blob(
            [
                `SecureVault Recovery Codes\n\n${recoveryCodes.join('\n')}\n`,
            ],
            { type: 'text/plain;charset=utf-8' },
        );
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = 'securevault-recovery-codes.txt';
        link.click();
        URL.revokeObjectURL(objectUrl);
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">
                        Profile Security
                    </h2>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={route('dashboard')}>Main</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Profile</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Profile Security" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start">
                        <div className="space-y-6">
                            <div className="lg:col-span-8 lg:order-1">
                                <Card>
                                <CardHeader className="flex flex-row items-center gap-2 border-b border-border pb-4">
                                    <User className="h-4 w-4 text-primary" />
                                    <CardTitle className="font-semibold text-foreground">
                                        Profile Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-5">
                                    <form onSubmit={submitProfile} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="name">Full Name</Label>
                                            <Input
                                                id="name"
                                                value={profileForm.data.name}
                                                onChange={(event) => profileForm.setData('name', event.target.value)}
                                                autoComplete="name"
                                            />
                                            {profileForm.errors.name && (
                                                <p className="text-sm text-destructive">{profileForm.errors.name}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="email">Email Address</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                value={profileForm.data.email}
                                                onChange={(event) => profileForm.setData('email', event.target.value)}
                                                autoComplete="email"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Changing your email will require re-verification.
                                            </p>
                                            {profileForm.errors.email && (
                                                <p className="text-sm text-destructive">{profileForm.errors.email}</p>
                                            )}
                                        </div>

                                        <div className="flex justify-end">
                                            <Button
                                                type="submit"
                                                disabled={profileForm.processing}
                                                className="bg-primary text-primary-foreground"
                                            >
                                                Update Profile
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                                </Card>
                            </div>

                            <div className="lg:col-span-8 lg:order-3">
                                <Card>
                                <CardHeader className="flex flex-row items-center gap-2 border-b border-border pb-4">
                                    <KeyRound className="h-4 w-4 text-primary" />
                                    <CardTitle className="font-semibold text-foreground">
                                        Update Password
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-5">
                                    <form onSubmit={submitPassword} className="space-y-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="current_password">Current Password</Label>
                                            <Input
                                                id="current_password"
                                                type="password"
                                                value={passwordForm.data.current_password}
                                                onChange={(event) => passwordForm.setData('current_password', event.target.value)}
                                                autoComplete="current-password"
                                            />
                                            {passwordForm.errors.current_password && (
                                                <p className="text-sm text-destructive">
                                                    {passwordForm.errors.current_password}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="password">New Password</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                value={passwordForm.data.password}
                                                onChange={(event) => passwordForm.setData('password', event.target.value)}
                                                autoComplete="new-password"
                                            />
                                            {passwordForm.data.password && (
                                                <PasswordStrengthBar password={passwordForm.data.password} />
                                            )}
                                            {passwordFieldError && (
                                                <div
                                                    className={`rounded-lg p-3 ${
                                                        passwordFieldError.includes('data breach')
                                                            ? 'border border-destructive/20 bg-destructive/10'
                                                            : ''
                                                    }`}
                                                >
                                                    {passwordFieldError.includes('data breach') && (
                                                        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-destructive">
                                                            <ShieldAlert className="h-4 w-4" />
                                                            Security Alert
                                                        </div>
                                                    )}
                                                    <p className="text-sm font-medium text-destructive">{passwordFieldError}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                            <Input
                                                id="password_confirmation"
                                                type="password"
                                                value={passwordForm.data.password_confirmation}
                                                onChange={(event) =>
                                                    passwordForm.setData('password_confirmation', event.target.value)
                                                }
                                                autoComplete="new-password"
                                            />
                                            {passwordConfirmationError && (
                                                <p className="text-sm text-destructive">{passwordConfirmationError}</p>
                                            )}
                                        </div>

                                        <div className="flex justify-end">
                                            <Button
                                                type="submit"
                                                disabled={passwordForm.processing}
                                                className="bg-primary text-primary-foreground"
                                            >
                                                Update Password
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                                </Card>
                            </div>

                            <div className="lg:col-span-6 lg:order-5">
                                <Card>
                                <CardHeader className="border-b border-border pb-4">
                                    <CardTitle className="text-sm font-semibold text-foreground">
                                        Your Data
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-5">
                                    <p className="text-sm text-muted-foreground">
                                        Download a copy of your personal data including your profile, document metadata, and activity history.
                                    </p>

                                    <Button
                                        type="button"
                                        className="w-full gap-2 bg-primary text-primary-foreground"
                                        disabled={exportRequestForm.processing || has_pending_export}
                                        onClick={requestDataExport}
                                    >
                                        {exportRequestForm.processing ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4" />
                                        )}
                                        {latestExportReady
                                            ? 'Export Ready'
                                            : has_pending_export
                                              ? 'Export Requested'
                                              : 'Request Data Export'}
                                    </Button>

                                    <InputError message={exportRequestError} />

                                    {latestExportPending && (
                                        <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <AlertDescription>
                                                Your export is being prepared. Refresh this page in a moment and the download button will appear here.
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {latestExportReady && latest_export?.download_url && (
                                        <Alert className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 [&>svg]:text-green-600 dark:[&>svg]:text-green-400">
                                            <ShieldCheck className="h-4 w-4" />
                                            <AlertDescription className="space-y-3">
                                                <p>
                                                    Your latest data export is ready to download.
                                                </p>
                                                <Button asChild variant="outline" className="w-full">
                                                    <a href={latest_export.download_url}>
                                                        <Download className="h-4 w-4" />
                                                        Download Latest Export
                                                    </a>
                                                </Button>
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        Exports include profile information, document metadata, and your activity log. Document file contents are not included. The download link expires after 24 hours and will appear here when ready.
                                    </p>
                                </CardContent>
                                </Card>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="lg:col-span-4 lg:order-2">
                                <Card>
                                <CardHeader className="border-b border-border pb-4">
                                    <CardTitle className="text-sm font-semibold text-foreground">
                                        Profile Picture
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-5">
                                    <div className="flex flex-col items-center gap-4 text-center">
                                        <UserAvatar
                                            user={auth.user}
                                            avatarUrl={displayedAvatarUrl}
                                            size="2xl"
                                        />
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-foreground">
                                                {auth.user.name}
                                            </p>
                                        </div>
                                    </div>

                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="hidden"
                                        onChange={handleAvatarSelected}
                                    />

                                    <div className="flex flex-col gap-2">
                                        <Button
                                            type="button"
                                            className="w-full gap-2 bg-primary text-primary-foreground"
                                            disabled={isAvatarBusy}
                                            onClick={triggerAvatarFilePicker}
                                        >
                                            {isAvatarUploading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Camera className="h-4 w-4" />
                                            )}
                                            {isAvatarUploading ? 'Uploading...' : 'Upload Photo'}
                                        </Button>

                                        {hasCustomAvatar && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="w-full gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                                                        disabled={isAvatarBusy}
                                                    >
                                                        {isAvatarRemoving ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                        {isAvatarRemoving ? 'Removing...' : 'Remove Photo'}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Remove profile picture?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Your custom profile picture will be deleted and SecureVault will fall back to Gravatar or initials.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={removeAvatar}
                                                        >
                                                            Remove Photo
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>

                                    {(isAvatarUploading || avatarUploadProgress !== null) && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>Upload progress</span>
                                                <span>{Math.round(avatarUploadProgress ?? 0)}%</span>
                                            </div>
                                            <Progress value={avatarUploadProgress ?? 0} className="h-2" />
                                        </div>
                                    )}

                                    <InputError message={avatarError ?? undefined} />

                                    <p className="text-xs text-muted-foreground">
                                        JPG, PNG, or WebP only. Max raw upload 8 MB. Images larger than 512x512 are resized automatically. Minimum source size 50x50 pixels.
                                    </p>
                                </CardContent>
                                </Card>
                            </div>

                            <div className="lg:col-span-4 lg:order-4">
                                {!two_factor_enabled ? (
                                    <Card className="border-amber-500/30 bg-amber-500/10">
                                        <CardContent className="space-y-4 pt-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <Badge
                                                        variant="outline"
                                                        className="mb-2 border-amber-500/30 bg-amber-500/20 text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400"
                                                    >
                                                        Action Recommended
                                                    </Badge>
                                                    <CardTitle className="text-lg text-foreground">
                                                        Two-Factor Authentication
                                                    </CardTitle>
                                                    <p className="text-sm text-muted-foreground">
                                                        Add an extra layer of security. 2FA is currently disabled.
                                                    </p>
                                                </div>
                                                <ShieldAlert className="h-10 w-10 flex-shrink-0 text-amber-500" />
                                            </div>
                                            <Button asChild className="w-full gap-2 bg-primary text-primary-foreground">
                                                <Link href="/two-factor/setup">
                                                    <Shield className="h-4 w-4" />
                                                    Enable 2FA
                                                </Link>
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="border-green-500/20 bg-green-500/5">
                                        <CardContent className="space-y-4 pt-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <Badge
                                                        variant="outline"
                                                        className="mb-2 border-green-500/30 bg-green-500/20 text-xs uppercase tracking-wide text-green-700 dark:text-green-400"
                                                    >
                                                        Protected
                                                    </Badge>
                                                    <CardTitle className="text-lg text-foreground">
                                                        Two-Factor Authentication
                                                    </CardTitle>
                                                    <p className="text-sm text-muted-foreground">
                                                        Your account is protected with TOTP-based 2FA.
                                                    </p>
                                                </div>
                                                <ShieldCheck className="h-10 w-10 flex-shrink-0 text-green-500" />
                                            </div>
    
                                            <div className="space-y-3 rounded-lg border border-border bg-background/80 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium text-foreground">Recovery Codes</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {recovery_codes_remaining} of 8 codes remaining
                                                        </p>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            recovery_codes_remaining <= 2
                                                                ? 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                                                : 'border-primary/20 bg-primary/15 text-primary'
                                                        }
                                                    >
                                                        {recovery_codes_remaining <= 2 ? 'Low' : 'Available'}
                                                    </Badge>
                                                </div>

                                                {recovery_codes_remaining <= 2 && (
                                                    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
                                                        <ShieldAlert className="h-4 w-4" />
                                                        <AlertDescription>
                                                            You are running low on recovery codes. Regenerate a fresh set and store them somewhere safe.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" className="w-full">
                                                            Regenerate Codes
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Regenerate recovery codes?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Regenerating codes will invalidate all existing recovery codes.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={regenerateRecoveryCodes}>
                                                                Regenerate Codes
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
                                                    >
                                                        Disable 2FA
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Disable 2FA?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Disabling two-factor authentication reduces your account security. Are you sure?
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            onClick={disableTwoFactor}
                                                        >
                                                            Disable 2FA
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            <div className="lg:col-span-6 lg:order-6">
                                <Card>
                                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                                    <CardTitle className="text-sm font-semibold text-foreground">
                                        Active Sessions
                                    </CardTitle>
                                    <Badge className="rounded-full bg-primary/15 text-xs text-primary">
                                        {session_count}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    <ScrollArea className="max-h-48">
                                        <div className="space-y-3">
                                            {recent_sessions.length > 0 ? (
                                                recent_sessions.map((session) => (
                                                    <div key={session.id} className="flex items-center gap-3">
                                                        <div className="flex-shrink-0 rounded bg-muted p-1.5">
                                                            <Monitor className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-foreground">
                                                                    Web Session
                                                                </span>
                                                                {session.is_current && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="border-primary/20 bg-primary/15 text-xs text-primary"
                                                                    >
                                                                        Current
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="truncate font-mono text-xs text-muted-foreground">
                                                                {session.ip_address ?? '—'}
                                                            </p>
                                                        </div>
                                                        <span className="flex-shrink-0 text-xs text-muted-foreground">
                                                            {formatSessionActivity(session.last_activity)}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    No active sessions found.
                                                </p>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    <Separator className="mb-3 mt-4" />
                                    <Link
                                        href="/sessions"
                                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                                    >
                                        View All Sessions
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </CardContent>
                                </Card>
                            </div>
                        </div>

                    </div>

                    <div className="mt-8 space-y-6">
                        <Separator />

                        <Card className="border-destructive/30 border-l-4">
                            <CardHeader className="border-b border-border pb-4">
                                <CardTitle className="text-sm font-semibold text-foreground">
                                    Danger Zone
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-5">
                                <p className="text-sm text-muted-foreground">
                                    Permanently delete your account and all associated data. This action cannot be undone.
                                </p>

                                {isSuperAdmin ? (
                                    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
                                        <ShieldAlert className="h-4 w-4" />
                                        <AlertDescription>
                                            Super Admin accounts cannot be self-deleted. Another Super Admin must demote this account first.
                                        </AlertDescription>
                                    </Alert>
                                ) : (
                                    <>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            className="w-full"
                                            onClick={() => setDeletionDialogOpen(true)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete My Account
                                        </Button>
                                        <InputError message={deleteAccountError} />
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <AlertDialog open={deletionDialogOpen} onOpenChange={(open) => !open ? closeDeletionDialog() : setDeletionDialogOpen(true)}>
                <AlertDialogContent>
                    <form onSubmit={submitDeletionRequest} className="space-y-4">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to delete your account?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Your account will be deactivated immediately. All your documents, shares, and data will be permanently deleted after 30 days. You can cancel within this window using the link in the confirmation email.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="space-y-1.5">
                            <Label htmlFor="delete_account_password">Password</Label>
                            <Input
                                id="delete_account_password"
                                type="password"
                                value={deleteAccountForm.data.password}
                                onChange={(event) => deleteAccountForm.setData('password', event.target.value)}
                                autoComplete="current-password"
                            />
                            <InputError message={deleteAccountForm.errors.password} />
                        </div>

                        {two_factor_enabled && (
                            <div className="space-y-1.5">
                                <Label htmlFor="delete_account_two_factor_code">2FA Code or Recovery Code</Label>
                                <Input
                                    id="delete_account_two_factor_code"
                                    value={deleteAccountForm.data.two_factor_code}
                                    onChange={(event) => deleteAccountForm.setData('two_factor_code', event.target.value)}
                                    placeholder="123456 or XXXX-XXXX"
                                    autoComplete="one-time-code"
                                />
                                <InputError message={deleteAccountForm.errors.two_factor_code} />
                            </div>
                        )}

                        <AlertDialogFooter>
                            <AlertDialogCancel type="button" onClick={closeDeletionDialog}>
                                Cancel
                            </AlertDialogCancel>
                            <Button
                                type="submit"
                                variant="destructive"
                                disabled={deleteAccountForm.processing}
                            >
                                {deleteAccountForm.processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Permanently Delete My Account'
                                )}
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={recoveryDialogOpen} onOpenChange={(open) => !open && closeRecoveryDialog()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Save your recovery codes</DialogTitle>
                        <DialogDescription>
                            These one-time-use codes let you sign in if you lose access to your authenticator app.
                        </DialogDescription>
                    </DialogHeader>

                    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertDescription>
                            These codes will not be shown again. Store them somewhere safe.
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-2">
                        {recoveryCodes.map((code) => (
                            <div
                                key={code}
                                className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-center font-mono text-sm text-foreground"
                            >
                                {code}
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="gap-2 sm:justify-between">
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <Button type="button" variant="outline" onClick={copyRecoveryCodes}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy all codes
                            </Button>
                            <Button type="button" variant="outline" onClick={downloadRecoveryCodes}>
                                <Download className="mr-2 h-4 w-4" />
                                Download as .txt
                            </Button>
                        </div>
                        <Button type="button" onClick={closeRecoveryDialog}>
                            I've saved my codes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}

