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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Copy, Download, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type SaveRecoveryCodesModalProps = {
    open: boolean;
    codes: string[];
    onConfirm: () => void;
    onForceClose: () => void;
};

const COPIED_RESET_DELAY = 1800;
const ALL_COPIED_RESET_DELAY = 2000;

export default function SaveRecoveryCodesModal({
    open,
    codes,
    onConfirm,
    onForceClose,
}: SaveRecoveryCodesModalProps) {
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [allCopied, setAllCopied] = useState(false);
    const [confirmReady, setConfirmReady] = useState(false);
    const [liveMessage, setLiveMessage] = useState('');
    const copiedTimeoutRef = useRef<number | null>(null);
    const allCopiedTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        setCopiedCode(null);
        setAllCopied(false);
        setConfirmReady(false);
        setLiveMessage('');
    }, [codes, open]);

    useEffect(() => {
        return () => {
            if (copiedTimeoutRef.current !== null) {
                window.clearTimeout(copiedTimeoutRef.current);
            }

            if (allCopiedTimeoutRef.current !== null) {
                window.clearTimeout(allCopiedTimeoutRef.current);
            }
        };
    }, []);

    const scheduleCopiedReset = () => {
        if (copiedTimeoutRef.current !== null) {
            window.clearTimeout(copiedTimeoutRef.current);
        }

        copiedTimeoutRef.current = window.setTimeout(() => {
            setCopiedCode(null);
        }, COPIED_RESET_DELAY);
    };

    const scheduleAllCopiedReset = () => {
        if (allCopiedTimeoutRef.current !== null) {
            window.clearTimeout(allCopiedTimeoutRef.current);
        }

        allCopiedTimeoutRef.current = window.setTimeout(() => {
            setAllCopied(false);
        }, ALL_COPIED_RESET_DELAY);
    };

    const handleCopyCode = async (code: string, index: number) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setAllCopied(false);
            setLiveMessage(`Recovery code ${index + 1} copied.`);
            scheduleCopiedReset();
        } catch {
            toast.error('Could not copy that recovery code.');
        }
    };

    const handleCopyAll = async () => {
        if (codes.length === 0) {
            return;
        }

        try {
            await navigator.clipboard.writeText(codes.join('\n'));
            setAllCopied(true);
            setCopiedCode(null);
            setLiveMessage('All recovery codes copied.');
            scheduleAllCopiedReset();
            toast.success('Recovery codes copied.');
        } catch {
            toast.error('Could not copy your recovery codes.');
        }
    };

    const handleDownload = () => {
        if (codes.length === 0) {
            return;
        }

        const blob = new Blob([`SecureVault Recovery Codes\n\n${codes.join('\n')}\n`], {
            type: 'text/plain;charset=utf-8',
        });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = objectUrl;
        link.download = 'securevault-recovery-codes.txt';
        link.click();

        window.setTimeout(() => {
            URL.revokeObjectURL(objectUrl);
        }, 0);

        setLiveMessage('Recovery codes downloaded.');
        toast.success('Recovery codes downloaded.');
    };

    return (
        <Dialog open={open}>
            <DialogContent
                className="overflow-hidden border-border bg-card p-0 shadow-2xl sm:max-w-[600px] [&>button]:hidden"
                onPointerDownOutside={(event) => event.preventDefault()}
                onEscapeKeyDown={(event) => event.preventDefault()}
            >
                <div className="relative p-6">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-4 top-4 h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close (will prompt confirmation)</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Close without saving?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Your recovery codes will not be shown again after this window closes. Save or
                                    download them before leaving.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Go back</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={onForceClose}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                    Close anyway
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <div className="space-y-5 pr-10">
                        <span aria-live="polite" className="sr-only">
                            {liveMessage}
                        </span>

                        <div className="flex items-start gap-4 pb-1">
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/15">
                                <ShieldCheck className="h-5 w-5 text-amber-500" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <DialogTitle className="text-base font-semibold leading-tight text-foreground">
                                        Save your recovery codes
                                    </DialogTitle>
                                    <Badge
                                        variant="secondary"
                                        className="rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[11px] font-mono font-medium tabular-nums text-muted-foreground"
                                    >
                                        {codes.length} codes
                                    </Badge>
                                </div>
                                <DialogDescription className="text-sm leading-snug text-muted-foreground">
                                    One-time-use codes to regain access if you lose your authenticator.
                                </DialogDescription>
                            </div>
                        </div>

                        <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm">
                            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                            <p className="leading-snug text-amber-700 dark:text-amber-400">
                                <span className="font-semibold">These codes will not be shown again.</span>{' '}
                                Copy or download them before closing this window.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                            {codes.map((code, index) => {
                                const isCopied = copiedCode === code;

                                return (
                                    <button
                                        key={code}
                                        type="button"
                                        onClick={() => void handleCopyCode(code, index)}
                                        className={cn(
                                            'group relative flex min-h-[56px] items-center justify-between gap-2 rounded-lg border px-3.5 py-3 text-left transition-colors',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                            'border-border bg-muted/35 text-foreground hover:border-amber-500/40 hover:bg-amber-500/6 hover:text-amber-700 dark:hover:text-amber-400',
                                            isCopied && 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400',
                                        )}
                                        aria-label={`Copy recovery code ${index + 1}: ${code}`}
                                    >
                                        <span className="absolute left-3 top-2 text-[10px] font-medium tabular-nums tracking-normal text-muted-foreground/55">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>

                                        <span className="block flex-1 pt-3 text-center font-mono text-[13px] font-medium tracking-[0.24em] sm:text-sm">
                                            {code}
                                        </span>

                                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-current opacity-50 transition-opacity group-hover:opacity-100">
                                            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex flex-col gap-3 pt-1">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void handleCopyAll()}
                                    className="h-11 flex-1 gap-1.5 sm:h-8"
                                >
                                    {allCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    {allCopied ? 'Copied!' : 'Copy all codes'}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
                                    className="h-11 flex-1 gap-1.5 sm:h-8"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Download .txt
                                </Button>
                            </div>

                            <Separator />

                            {!confirmReady ? (
                                <Button
                                    type="button"
                                    onClick={() => setConfirmReady(true)}
                                    className="h-11 w-full gap-2"
                                >
                                    <ShieldCheck className="h-4 w-4" />
                                    I've saved my codes
                                </Button>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-center text-xs text-muted-foreground">
                                        Confirm you stored these codes in a safe place.
                                    </p>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setConfirmReady(false)}
                                            className="h-11 flex-1"
                                        >
                                            Go back
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={onConfirm}
                                            className="h-11 flex-1 gap-1.5"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                            Confirm &amp; close
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
