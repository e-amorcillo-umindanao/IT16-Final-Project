import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import GravatarAvatar from '@/components/GravatarAvatar';
import { format, formatDistanceToNow } from 'date-fns';
import {
    ArrowLeft,
    Check,
    Copy,
    Download,
    File,
    FileText,
    FileType,
    Image as ImageIcon,
    Lock,
    Sheet,
    ShieldCheck,
    Trash2,
    X,
    ShieldAlert,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type SharePermission = 'view_only' | 'download' | 'full_access';
type UserPermission = 'owner' | 'admin_viewer' | SharePermission | 'none';

interface DocumentDetails {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    file_hash: string;
    description: string | null;
    created_at: string;
    user_id: number;
    owner_name: string;
    owner_avatar_url: string | null;
    scan_result: any;
}

interface AuditTrailEntry {
    action: string;
    created_at: string;
    user: {
        name: string;
        email: string;
        avatar_url: string | null;
    } | null;
}

interface ShareItem {
    id: number;
    permission: SharePermission;
    expires_at: string | null;
    user: {
        name: string;
        email: string;
        avatar_url: string | null;
    };
}

interface Props extends PageProps {
    document: DocumentDetails;
    auditTrail: AuditTrailEntry[];
    shares: ShareItem[];
    userPermission: UserPermission;
}



function formatBytes(bytes: number) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(mimeType: string) {
    const normalized = mimeType.toLowerCase();

    if (normalized.includes('pdf')) return FileText;
    if (normalized.includes('word') || normalized.includes('officedocument.wordprocessingml.document')) return FileType;
    if (normalized.includes('sheet') || normalized.includes('excel') || normalized.includes('spreadsheetml')) return Sheet;
    if (normalized.includes('image/png') || normalized.includes('image/jpeg') || normalized.includes('image/jpg')) return ImageIcon;
    return File;
}

function getActivityBadge(action: string) {
    switch (action) {
        case 'document_uploaded':
            return { label: 'Uploaded', className: 'bg-primary/15 text-primary' };
        case 'document_downloaded':
            return { label: 'Downloaded', className: 'bg-green-500/15 text-green-600 dark:text-green-400' };
        case 'document_shared':
            return { label: 'Shared', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' };
        case 'document_deleted':
            return { label: 'Deleted', className: 'bg-destructive/15 text-destructive' };
        case 'integrity_violation':
            return { label: 'Integrity Alert', className: 'bg-destructive/15 text-destructive' };
        default:
            return {
                label: action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
                className: 'bg-muted text-muted-foreground',
            };
    }
}

function getPermissionLabel(permission: SharePermission) {
    switch (permission) {
        case 'view_only':
            return 'View Only';
        case 'download':
            return 'Download';
        case 'full_access':
            return 'Full Access';
    }
}

function getPermissionClass(permission: SharePermission) {
    switch (permission) {
        case 'view_only':
            return 'text-xs text-muted-foreground';
        case 'download':
            return 'text-xs font-medium text-primary';
        case 'full_access':
            return 'text-xs font-semibold text-primary';
    }
}

export default function Show({ auth, document, auditTrail, shares, userPermission }: Props) {
    const [copied, setCopied] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [shareToRevoke, setShareToRevoke] = useState<ShareItem | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        permission: 'view_only' as SharePermission,
        expires_at: '',
    });

    useEffect(() => {
        if (!copied) {
            return;
        }

        const timeout = window.setTimeout(() => setCopied(false), 2000);
        return () => window.clearTimeout(timeout);
    }, [copied]);

    const canManageShares = userPermission === 'owner' || userPermission === 'full_access';
    const canDelete = userPermission === 'owner';
    const canDownload = userPermission === 'owner' || userPermission === 'download' || userPermission === 'full_access';
    const FileIcon = getFileIcon(document.mime_type);
    const truncatedHash = `sha256:${document.file_hash.slice(0, 8)}...${document.file_hash.slice(-4)}`;

    const handleDownload = () => {
        window.location.assign(route('documents.download', document.id));
    };

    const handleDelete = () => {
        router.delete(route('documents.destroy', document.id), {
            preserveScroll: true,
            onFinish: () => setShowDeleteDialog(false),
        });
    };

    const handleCopyHash = async () => {
        try {
            await navigator.clipboard.writeText(document.file_hash);
            setCopied(true);
        } catch {
            toast.error('Unable to copy hash.');
        }
    };

    const handleShareSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        post(route('shares.store', document.id), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Access granted successfully.');
                reset();
            },
        });
    };

    const handleRevokeShare = () => {
        if (!shareToRevoke) {
            return;
        }

        router.delete(route('shares.destroy', shareToRevoke.id), {
            preserveScroll: true,
            onFinish: () => setShareToRevoke(null),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" asChild>
                                <Link href={route('documents.index')}>
                                    <ArrowLeft className="h-4 w-4" />
                                    <span className="sr-only">Back to documents</span>
                                </Link>
                            </Button>
                            <h2 className="text-2xl font-semibold text-foreground">Document Details</h2>
                        </div>
                        <p className="text-xs text-muted-foreground">Main &#8250; My Vault &#8250; Document Details</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {canDownload && (
                            <Button
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={handleDownload}
                            >
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        )}
                        {canDelete && (
                            <Button
                                variant="outline"
                                className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 className="h-4 w-4" />
                                Move to Trash
                            </Button>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={`Document Details - ${document.original_name}`} />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="space-y-6 lg:col-span-2">
                            {userPermission === 'admin_viewer' && (
                                <Alert className="mb-4 border-l-4 border-l-primary">
                                    <ShieldCheck className="h-4 w-4" />
                                    <AlertDescription>
                                        You are viewing this document as an administrator (read-only).
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="rounded-lg border border-border bg-card p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-lg bg-muted p-3">
                                            <FileIcon className="h-12 w-12 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-semibold text-foreground">
                                                {document.original_name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                                <Lock className="h-3.5 w-3.5" />
                                                Fully Encrypted (AES-256)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-lg border border-border bg-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        File Size
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-foreground">
                                        {formatBytes(document.file_size)}
                                    </p>
                                </div>

                                <div className="rounded-lg border border-border bg-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Uploaded By
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <GravatarAvatar 
                                            name={document.owner_name} 
                                            avatarUrl={document.owner_avatar_url} 
                                            size="xs" 
                                        />
                                        <p className="text-sm font-medium text-foreground">{document.owner_name}</p>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Uploaded On
                                    </p>
                                    <p className="mt-2 text-sm font-medium text-foreground">
                                        {format(new Date(document.created_at), 'MMMM do, yyyy')}
                                    </p>
                                </div>

                                <div className="rounded-lg border border-border bg-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Integrity Hash
                                    </p>
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <p className="min-w-0 truncate font-mono text-sm text-foreground" title={document.file_hash}>
                                            {truncatedHash}
                                        </p>
                                        <Button variant="ghost" size="sm" onClick={handleCopyHash}>
                                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {document.description && document.description.trim() !== '' && (
                                <div className="rounded-lg border border-border bg-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Description
                                    </p>
                                    <p className="mt-2 text-sm text-foreground">{document.description}</p>
                                </div>
                            )}

                            <div className="rounded-lg border border-border bg-card">
                                <div className="border-b border-border px-5 py-4">
                                    <h3 className="font-semibold text-foreground">Audit Trail / Recent Activity</h3>
                                </div>
                                <Table>
                                    <TableHeader className="bg-muted [&_tr]:border-border">
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                                User
                                            </TableHead>
                                            <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                                Action
                                            </TableHead>
                                            <TableHead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
                                                Time
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {auditTrail.length === 0 ? (
                                            <TableRow className="border-border hover:bg-transparent">
                                                <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                                                    No activity recorded yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            auditTrail.map((entry, index) => {
                                                const badge = getActivityBadge(entry.action);
                                                const userName = entry.user?.name ?? 'System';

                                                return (
                                                    <TableRow key={`${entry.action}-${entry.created_at}-${index}`} className="hover:bg-muted/50">
                                                        <TableCell>
                                                            <div className="flex items-center gap-3">
                                                                <GravatarAvatar 
                                                                    name={userName} 
                                                                    avatarUrl={entry.user?.avatar_url ?? null} 
                                                                    size="xs" 
                                                                />
                                                                <p className="text-sm font-medium text-foreground">
                                                                    {userName}
                                                                </p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span
                                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                                                            >
                                                                {badge.label}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="space-y-6 lg:col-span-1">
                            {canManageShares && (
                                <>
                                    <div className="rounded-lg border border-border bg-card p-5">
                                        <div className="space-y-1">
                                            <h3 className="font-semibold text-foreground">Share Document</h3>
                                            <p className="text-xs text-muted-foreground">Add secure collaborators.</p>
                                        </div>

                                        <form onSubmit={handleShareSubmit} className="mt-5 space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email Address</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="collaborator@company.com"
                                                    value={data.email}
                                                    onChange={(event) => setData('email', event.target.value)}
                                                    className="bg-background"
                                                    required
                                                />
                                                {errors.email && (
                                                    <p className="text-sm text-destructive">{errors.email}</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="permission">Permission Level</Label>
                                                <Select
                                                    value={data.permission}
                                                    onValueChange={(value) => setData('permission', value as SharePermission)}
                                                >
                                                    <SelectTrigger id="permission" className="bg-background">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="view_only">View Only</SelectItem>
                                                        <SelectItem value="download">Download</SelectItem>
                                                        <SelectItem value="full_access">Full Access</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="expires_at">
                                                    Expiry Date <span className="text-muted-foreground">(optional)</span>
                                                </Label>
                                                <input
                                                    id="expires_at"
                                                    type="date"
                                                    value={data.expires_at}
                                                    onChange={(event) => setData('expires_at', event.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                                                />
                                            </div>

                                            {errors.permission && (
                                                <p className="text-sm text-destructive">{errors.permission}</p>
                                            )}
                                            {errors.expires_at && (
                                                <p className="text-sm text-destructive">{errors.expires_at}</p>
                                            )}

                                            <Button
                                                type="submit"
                                                disabled={processing}
                                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                                            >
                                                Grant Access
                                            </Button>
                                        </form>
                                    </div>

                                    <div className="rounded-lg border border-border bg-card p-5">
                                        <h3 className="font-semibold text-foreground">Access Control</h3>

                                        <div className="mt-4 space-y-4">
                                            {shares.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No collaborators yet.</p>
                                            ) : (
                                                shares.map((share) => (
                                                    <div key={share.id} className="flex items-start justify-between gap-3">
                                                        <div className="flex min-w-0 items-start gap-3">
                                                            <GravatarAvatar 
                                                                name={share.user.name} 
                                                                avatarUrl={share.user.avatar_url} 
                                                                size="sm" 
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-foreground">
                                                                    {share.user.name}
                                                                </p>
                                                                <p className={getPermissionClass(share.permission)}>
                                                                    {getPermissionLabel(share.permission)}
                                                                </p>
                                                                {share.expires_at && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Expires{' '}
                                                                        {formatDistanceToNow(new Date(share.expires_at), {
                                                                            addSuffix: true,
                                                                        })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => setShareToRevoke(share)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                            <span className="sr-only">Revoke access</span>
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Move to Trash</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to move this document to trash?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleDelete}>
                            Move to Trash
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={shareToRevoke !== null} onOpenChange={(open) => !open && setShareToRevoke(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Access</DialogTitle>
                        <DialogDescription>
                            {shareToRevoke
                                ? `Remove access for ${shareToRevoke.user.name}?`
                                : 'Remove access for this collaborator?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShareToRevoke(null)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleRevokeShare}>
                            Remove Access
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
