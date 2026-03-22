import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import {
    AlertTriangle,
    File,
    FileText,
    FileType,
    Image as ImageIcon,
    Info,
    RotateCcw,
    Sheet,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface TrashDocument {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    deleted_at: string;
}

interface Props {
    documents: TrashDocument[];
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes.toFixed(2)} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(mimeType: string) {
    const normalized = mimeType.toLowerCase();

    if (normalized.includes('pdf')) return <FileText className="h-5 w-5 text-muted-foreground" />;
    if (
        normalized.includes('word') ||
        normalized.includes('officedocument.wordprocessingml.document') ||
        normalized.includes('msword')
    ) {
        return <FileType className="h-5 w-5 text-muted-foreground" />;
    }
    if (
        normalized.includes('sheet') ||
        normalized.includes('excel') ||
        normalized.includes('spreadsheetml')
    ) {
        return <Sheet className="h-5 w-5 text-muted-foreground" />;
    }
    if (
        normalized.includes('image/jpeg') ||
        normalized.includes('image/jpg') ||
        normalized.includes('image/png')
    ) {
        return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
    }

    return <File className="h-5 w-5 text-muted-foreground" />;
}

function getDaysRemaining(deletedAt: string) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return 30 - Math.floor((Date.now() - new Date(deletedAt).getTime()) / msPerDay);
}

function ExpiryStatus({ deletedAt }: { deletedAt: string }) {
    const daysRemaining = getDaysRemaining(deletedAt);

    if (daysRemaining <= 0) {
        return (
            <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-xs text-destructive">
                Expires today
            </Badge>
        );
    }

    if (daysRemaining <= 3) {
        return (
            <Badge variant="outline" className="gap-1 border-destructive/20 bg-destructive/10 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {daysRemaining}d remaining
            </Badge>
        );
    }

    if (daysRemaining <= 7) {
        return (
            <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-400">
                {daysRemaining}d remaining
            </Badge>
        );
    }

    return <span className="text-xs text-muted-foreground">{daysRemaining} days remaining</span>;
}

export default function TrashIndex({ documents }: Props) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [isRestoringSelected, setIsRestoringSelected] = useState(false);

    const allSelected = useMemo(
        () => documents.length > 0 && selectedIds.length === documents.length,
        [documents.length, selectedIds.length]
    );

    const toggleAll = (checked: boolean) => {
        setSelectedIds(checked ? documents.map((document) => document.id) : []);
    };

    const toggleOne = (documentId: number, checked: boolean) => {
        setSelectedIds((current) =>
            checked ? [...current, documentId] : current.filter((id) => id !== documentId)
        );
    };

    const handleRestore = (id: number) => {
        setProcessingId(id);
        router.post(route('documents.restore', id), {}, {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
        });
    };

    const handleRestoreSelected = () => {
        if (selectedIds.length === 0) {
            return;
        }

        setIsRestoringSelected(true);
        router.post(
            route('documents.restore-selected'),
            { ids: selectedIds },
            {
                preserveScroll: true,
                onFinish: () => setIsRestoringSelected(false),
            }
        );
    };

    const handlePermanentDelete = (id: number) => {
        setProcessingId(id);
        router.delete(route('documents.force-delete', id), {
            preserveScroll: true,
            onFinish: () => {
                setProcessingId(null);
            },
        });
    };

    const handleEmptyTrash = () => {
        router.delete(route('documents.empty-trash'), {
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="w-full space-y-1">
                    <h2 className="text-2xl font-semibold text-foreground">Trash</h2>
                    <p className="text-sm text-muted-foreground">Manage and recover your deleted documents.</p>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/dashboard">Main</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Trash</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Trash" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <Alert className="border-l-4 border-l-primary bg-primary/5">
                        <Info className="h-4 w-4 text-primary" />
                        <AlertTitle className="text-sm font-semibold text-foreground">Notice</AlertTitle>
                        <AlertDescription className="text-sm text-muted-foreground">
                            Documents in the trash will be permanently deleted after 30 days. No recovery is possible after that period.
                        </AlertDescription>
                    </Alert>

                    <Separator className="my-6" />

                    {documents.length === 0 ? (
                        <div className="flex min-h-[calc(100vh-24rem)] items-center justify-center">
                            <Card className="flex w-full max-w-md flex-col items-center justify-center py-20">
                                <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
                                    <div className="inline-block rounded-xl bg-muted p-4">
                                        <Trash2 className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">Your trash is empty</h3>
                                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                                            Deleted documents will appear here for 30 days before being permanently removed.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-border bg-card">
                            <Table>
                                <TableHeader className="bg-background [&_tr]:border-border">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="w-10">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={(checked) => toggleAll(checked === true)}
                                                aria-label="Select all documents in trash"
                                            />
                                        </TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Deleted On</TableHead>
                                        <TableHead>Expires In</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.map((document) => (
                                        <TableRow key={document.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(document.id)}
                                                    onCheckedChange={(checked) => toggleOne(document.id, checked === true)}
                                                    aria-label={`Select ${document.original_name}`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {getFileIcon(document.mime_type)}
                                                    <span
                                                        className="max-w-[320px] truncate font-medium text-foreground"
                                                        title={document.original_name}
                                                    >
                                                        {document.original_name}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatBytes(document.file_size)}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(new Date(document.deleted_at), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell>
                                                <ExpiryStatus deletedAt={document.deleted_at} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="gap-1.5"
                                                                    onClick={() => handleRestore(document.id)}
                                                                    disabled={processingId === document.id}
                                                                    aria-label={`Restore ${document.original_name}`}
                                                                >
                                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                                    Restore
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Restore to My Vault</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="gap-1.5 text-destructive hover:bg-destructive/10"
                                                                disabled={processingId === document.id}
                                                                aria-label={`Delete ${document.original_name} permanently`}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                Delete Permanently
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete Permanently?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. The document and its encrypted file will be permanently deleted from the server.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    onClick={() => handlePermanentDelete(document.id)}
                                                                >
                                                                    Delete Permanently
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter className="bg-background">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableCell colSpan={6}>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">
                                                    {selectedIds.length > 0
                                                        ? `${selectedIds.length} selected`
                                                        : `${documents.length} item(s) in trash`}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                    {selectedIds.length > 0 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="gap-1.5 text-sm"
                                                            onClick={handleRestoreSelected}
                                                            disabled={isRestoringSelected}
                                                            aria-label={`Restore ${selectedIds.length} selected document${selectedIds.length !== 1 ? 's' : ''}`}
                                                        >
                                                            <RotateCcw className="h-3.5 w-3.5" />
                                                            Restore Selected
                                                        </Button>
                                                    )}

                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-destructive hover:bg-destructive/10"
                                                                aria-label={`Empty trash and permanently delete ${documents.length} document${documents.length !== 1 ? 's' : ''}`}
                                                            >
                                                                Empty Trash
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Empty Trash?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently delete all {documents.length} document(s) in your trash. This cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                    onClick={handleEmptyTrash}
                                                                >
                                                                    Empty Trash
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
