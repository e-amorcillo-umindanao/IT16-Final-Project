import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileTypeBadge } from '@/components/FileTypeBadge';
import { ScanBadge, type ScanResult } from '@/components/ScanBadge';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Activity,
    ArrowLeft,
    CalendarIcon,
    Check,
    Copy,
    Download,
    File,
    FileText,
    FileType,
    History,
    Image as ImageIcon,
    Link2,
    Loader2,
    Lock,
    Sheet,
    Share2,
    ShieldCheck,
    ShieldAlert,
    Trash2,
    Upload,
    X,
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
    is_starred: boolean;
    owner_name: string;
    owner_avatar_url: string | null;
    scan_result: ScanResult;
}

interface AuditTrailEntry {
    action: string;
    created_at: string;
    metadata: Record<string, any> | null;
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

const avatarColors = [
    'bg-amber-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-violet-600',
    'bg-orange-600',
    'bg-teal-600',
];

function getAvatarColor(name: string) {
    return avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : parts[0]?.[1] ?? '';

    return `${first}${last}`.toUpperCase();
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

function getActionText(action: string, metadata: Record<string, any> | null) {
    switch (action) {
        case 'document_uploaded':
            return 'Uploaded file';
        case 'document_downloaded':
            return 'Downloaded file';
        case 'document_shared':
            return `Shared with ${metadata?.shared_with ?? 'a user'}`;
        case 'document_deleted':
            return 'Moved to trash';
        case 'integrity_violation':
            return 'Integrity violation detected on';
        default:
            return action.replace(/_/g, ' ');
    }
}

function getActionIcon(action: string) {
    switch (action) {
        case 'document_uploaded':
            return <Upload className="inline h-3.5 w-3.5 text-primary" />;
        case 'document_downloaded':
            return <Download className="inline h-3.5 w-3.5 text-green-500" />;
        case 'document_shared':
            return <Share2 className="inline h-3.5 w-3.5 text-blue-500" />;
        case 'document_deleted':
            return <Trash2 className="inline h-3.5 w-3.5 text-destructive" />;
        case 'integrity_violation':
            return <ShieldAlert className="inline h-3.5 w-3.5 text-destructive" />;
        default:
            return <Activity className="inline h-3.5 w-3.5 text-muted-foreground" />;
    }
}

function formatRelativeTime(value: string) {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
}

function parseDateValue(value: string) {
    if (!value) {
        return undefined;
    }

    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
}

function formatDateValue(date?: Date) {
    return date ? format(date, 'yyyy-MM-dd') : '';
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

function getPermissionBadge(permission: SharePermission) {
    return (
        <Badge
            variant="outline"
            className={
                permission === 'full_access'
                    ? 'border-primary/20 bg-primary/10 text-primary'
                    : permission === 'download'
                      ? 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-400'
                      : 'border-border bg-muted text-muted-foreground'
            }
        >
            {getPermissionLabel(permission)}
        </Badge>
    );
}

export default function Show({ auth, document, auditTrail, shares, userPermission }: Props) {
    const [copied, setCopied] = useState(false);
    const [linkExpiry, setLinkExpiry] = useState('24');
    const [copyingLink, setCopyingLink] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [shareExpiryDate, setShareExpiryDate] = useState<Date | undefined>(undefined);
    const [shareExpiryOpen, setShareExpiryOpen] = useState(false);

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

    useEffect(() => {
        if (!linkCopied) {
            return;
        }

        const timeout = window.setTimeout(() => setLinkCopied(false), 3000);
        return () => window.clearTimeout(timeout);
    }, [linkCopied]);

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
                setShareExpiryDate(undefined);
                setShareExpiryOpen(false);
                reset();
            },
        });
    };

    const handleRevokeShare = (shareId: number) => {
        router.delete(route('shares.destroy', shareId), {
            preserveScroll: true,
        });
    };

    const handleCopyLink = async () => {
        setCopyingLink(true);

        try {
            const csrfToken = window.document
                .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.getAttribute('content') ?? '';

            const response = await fetch(route('documents.share-link', document.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    expires_hours: Number.parseInt(linkExpiry, 10),
                }),
            });

            if (!response.ok) {
                throw new Error('Unable to generate link');
            }

            const payload = (await response.json()) as { url: string };
            await navigator.clipboard.writeText(payload.url);
            setLinkCopied(true);
            toast.success('Share link copied to clipboard!');
        } catch {
            toast.error('Failed to generate share link.');
        } finally {
            setCopyingLink(false);
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" aria-label="Back to documents" asChild>
                                <Link href={route('documents.index')}>
                                    <ArrowLeft className="h-4 w-4" />
                                    <span className="sr-only">Back to documents</span>
                                </Link>
                            </Button>
                            <h2 className="text-2xl font-semibold text-foreground">Document Details</h2>
                        </div>
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href={route('dashboard')}>Main</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href={route('documents.index')}>My Vault</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>Document Details</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
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
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Move to Trash
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This document will be permanently deleted after 30 days. You can restore it from the Trash page within that window.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={handleDelete}
                                        >
                                            Move to Trash
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
                                <Alert className="mb-4 border-l-4 border-l-primary bg-primary/5">
                                    <ShieldCheck className="h-4 w-4" />
                                    <AlertDescription className="text-sm text-foreground">
                                        You are viewing this document as an administrator (read-only).
                                    </AlertDescription>
                                </Alert>
                            )}

                            {userPermission === 'admin_viewer' && <Separator className="my-4" />}

                            <Card>
                                <CardContent className="flex items-center gap-4 p-5">
                                    <div className="flex-shrink-0 rounded-lg bg-muted p-3">
                                        <FileIcon className="h-12 w-12 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-xl font-semibold text-foreground">
                                            {document.original_name}
                                        </h3>
                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="gap-1 border-primary/20 bg-primary/10 text-xs text-primary"
                                            >
                                                <Lock className="h-3 w-3" />
                                                Fully Encrypted (AES-256)
                                            </Badge>
                                            <FileTypeBadge mimeType={document.mime_type} />
                                            <ScanBadge result={document.scan_result} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Card>
                                    <CardContent className="pt-5">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            File Size
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Activity className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold text-foreground">
                                                {formatBytes(document.file_size)}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-5">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Uploaded By
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={document.owner_avatar_url ?? undefined} alt={document.owner_name} />
                                                <AvatarFallback className={`text-[10px] text-white ${getAvatarColor(document.owner_name)}`}>
                                                    {getInitials(document.owner_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="font-semibold text-foreground">{document.owner_name}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-5">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Uploaded On
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-semibold text-foreground">
                                                {format(new Date(document.created_at), 'MMMM do, yyyy')}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-5">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Integrity Hash
                                        </p>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate font-mono text-sm text-foreground" title={document.file_hash}>
                                                {truncatedHash}
                                            </span>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 flex-shrink-0"
                                                            onClick={handleCopyHash}
                                                            aria-label={copied ? 'Hash copied' : 'Copy integrity hash'}
                                                        >
                                                            {copied ? (
                                                                <Check className="h-3.5 w-3.5 text-green-500" />
                                                            ) : (
                                                                <Copy className="h-3.5 w-3.5" />
                                                            )}
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{copied ? 'Copied!' : 'Copy full hash'}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {document.description && document.description.trim() !== '' && (
                                <Card>
                                    <CardContent className="pt-5">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Description
                                        </p>
                                        <p className="text-sm text-foreground">{document.description}</p>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                                    <CardTitle className="font-semibold text-foreground">Audit Trail / Recent Activity</CardTitle>
                                    <History className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Action</TableHead>
                                                <TableHead className="text-right">Time</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {auditTrail.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                                                        No activity recorded yet.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                auditTrail.map((entry, index) => {
                                                    const userName = entry.user?.name ?? 'System';

                                                    return (
                                                        <TableRow key={`${entry.action}-${entry.created_at}-${index}`} className="hover:bg-muted/50">
                                                            <TableCell>
                                                                <div className="flex items-center gap-2.5">
                                                                    <Avatar className="h-7 w-7">
                                                                        <AvatarImage src={entry.user?.avatar_url ?? undefined} alt={userName} />
                                                                        <AvatarFallback className={`text-xs text-white ${getAvatarColor(userName)}`}>
                                                                            {getInitials(userName)}
                                                                        </AvatarFallback>
                                                                    </Avatar>
                                                                    <span className="text-sm font-medium text-foreground">{userName}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm text-muted-foreground">
                                                                    {getActionIcon(entry.action)}{' '}
                                                                    {getActionText(entry.action, entry.metadata)}
                                                                    {entry.metadata?.document_name && (
                                                                        <>
                                                                            {' '}
                                                                            <strong className="font-semibold text-foreground">
                                                                                {entry.metadata.document_name}
                                                                            </strong>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                                {formatRelativeTime(entry.created_at)}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6 lg:col-span-1">
                            {canManageShares && (
                                <>
                                    <Card>
                                        <CardHeader className="border-b border-border pb-3">
                                            <CardTitle className="font-semibold text-foreground">Share Document</CardTitle>
                                            <p className="text-xs text-muted-foreground">Add secure collaborators.</p>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-5">
                                            <form onSubmit={handleShareSubmit} className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="email">Email Address</Label>
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        placeholder="collaborator@example.com"
                                                        value={data.email}
                                                        onChange={(event) => setData('email', event.target.value)}
                                                        required
                                                    />
                                                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="permission">Permission Level</Label>
                                                    <Select
                                                        value={data.permission}
                                                        onValueChange={(value) => setData('permission', value as SharePermission)}
                                                    >
                                                        <SelectTrigger id="permission">
                                                            <SelectValue placeholder="Select permission" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="view_only">View Only</SelectItem>
                                                            <SelectItem value="download">Download</SelectItem>
                                                            <SelectItem value="full_access">Full Access</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.permission && <p className="text-xs text-destructive">{errors.permission}</p>}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label htmlFor="expires_at">
                                                        Expiry Date{' '}
                                                        <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                                                    </Label>
                                                    <Popover open={shareExpiryOpen} onOpenChange={setShareExpiryOpen}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                id="expires_at"
                                                                type="button"
                                                                variant="outline"
                                                                className={`w-full justify-start text-left font-normal ${!shareExpiryDate ? 'text-muted-foreground' : ''}`}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                                                                {shareExpiryDate
                                                                    ? format(shareExpiryDate, 'PPP')
                                                                    : 'No expiry'}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={shareExpiryDate}
                                                                onSelect={(date) => {
                                                                    setShareExpiryDate(date);
                                                                    setData('expires_at', formatDateValue(date));
                                                                    setShareExpiryOpen(false);
                                                                }}
                                                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    {errors.expires_at && <p className="text-xs text-destructive">{errors.expires_at}</p>}
                                                </div>

                                                <Button
                                                    type="submit"
                                                    disabled={processing}
                                                    className="w-full bg-primary text-primary-foreground"
                                                >
                                                    Grant Access
                                                </Button>

                                                <Separator />

                                                <div className="space-y-2">
                                                    <Label className="text-xs text-muted-foreground">
                                                        Or copy a time-limited share link
                                                    </Label>
                                                    <div className="flex gap-2">
                                                        <Select value={linkExpiry} onValueChange={setLinkExpiry}>
                                                            <SelectTrigger className="w-36">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="1">1 hour</SelectItem>
                                                                <SelectItem value="24">24 hours</SelectItem>
                                                                <SelectItem value="72">3 days</SelectItem>
                                                                <SelectItem value="168">7 days</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className="flex-1 gap-2"
                                                            onClick={() => void handleCopyLink()}
                                                            disabled={copyingLink}
                                                        >
                                                            {copyingLink ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : linkCopied ? (
                                                                <Check className="h-4 w-4 text-green-500" />
                                                            ) : (
                                                                <Link2 className="h-4 w-4" />
                                                            )}
                                                            {linkCopied ? 'Copied!' : 'Copy Link'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </form>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="border-b border-border pb-3">
                                            <CardTitle className="font-semibold text-foreground">Access Control</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-4">
                                            {shares.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">No collaborators yet.</p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {shares.map((share) => (
                                                        <div key={share.id} className="flex items-center justify-between gap-3">
                                                            <div className="flex min-w-0 items-center gap-2.5">
                                                                <Avatar className="h-8 w-8 flex-shrink-0">
                                                                    <AvatarImage src={share.user.avatar_url ?? undefined} alt={share.user.name} />
                                                                    <AvatarFallback className={`text-xs text-white ${getAvatarColor(share.user.name)}`}>
                                                                        {getInitials(share.user.name)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="min-w-0">
                                                                    <p className="truncate text-sm font-medium text-foreground">
                                                                        {share.user.name}
                                                                    </p>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {getPermissionBadge(share.permission)}
                                                                        {share.expires_at && (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                Expires {formatRelativeTime(share.expires_at)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                                                                        aria-label={`Remove access for ${share.user.name}`}
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                        <span className="sr-only">Revoke access</span>
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Remove Access?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Remove access for {share.user.name}? They will no longer be able to view this document.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                            onClick={() => handleRevokeShare(share.id)}
                                                                        >
                                                                            Remove Access
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </AuthenticatedLayout>
    );
}
