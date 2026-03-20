import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
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
        return <span className="text-xs font-semibold text-destructive">Expires today</span>;
    }

    if (daysRemaining < 3) {
        return (
            <div className="flex items-center gap-1 text-xs font-medium text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <span>{daysRemaining} days remaining</span>
            </div>
        );
    }

    if (daysRemaining <= 7) {
        return (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {daysRemaining} days remaining
            </span>
        );
    }

    return <span className="text-xs text-muted-foreground">{daysRemaining} days remaining</span>;
}

export default function TrashIndex({ documents }: Props) {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [isRestoringSelected, setIsRestoringSelected] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<TrashDocument | null>(null);
    const [showEmptyTrashDialog, setShowEmptyTrashDialog] = useState(false);

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

    const handlePermanentDelete = () => {
        if (!documentToDelete) {
            return;
        }

        setProcessingId(documentToDelete.id);
        router.delete(route('documents.force-delete', documentToDelete.id), {
            preserveScroll: true,
            onFinish: () => {
                setProcessingId(null);
                setDocumentToDelete(null);
            },
        });
    };

    const handleEmptyTrash = () => {
        router.delete(route('documents.empty-trash'), {
            preserveScroll: true,
            onFinish: () => setShowEmptyTrashDialog(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="w-full space-y-3">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-semibold text-foreground">Trash</h2>
                        <p className="text-sm text-muted-foreground">
                            Manage and recover your deleted documents.
                        </p>
                        <p className="text-xs text-muted-foreground">Main › Trash</p>
                    </div>
                    <Separator />
                </div>
            }
        >
            <Head title="Trash" />

            <div className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                    <Alert variant="default" className="border-l-4 border-l-primary text-foreground">
                        <Info className="h-4 w-4" />
                        <AlertTitle className="uppercase tracking-wide">Notice</AlertTitle>
                        <AlertDescription className="text-sm text-foreground">
                            <p>Documents in the trash will be permanently deleted after 30 days.</p>
                            <p>No recovery is possible after that period.</p>
                        </AlertDescription>
                    </Alert>

                    {documents.length === 0 ? (
                        <div className="flex min-h-[calc(100vh-24rem)] items-center justify-center">
                            <div className="flex max-w-md flex-col items-center text-center">
                                <div className="mb-4 inline-block rounded-xl bg-muted p-4">
                                    <Trash2 className="h-12 w-12 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold text-foreground">Your trash is empty</h3>
                                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                                    Deleted documents will appear here for 30 days before being permanently removed.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-lg border border-border bg-card">
                            <Table>
                                <TableHeader className="bg-background [&_tr]:border-border">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="w-12">
                                            <Checkbox checked={allSelected} onCheckedChange={(checked) => toggleAll(checked === true)} />
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
                                        <TableRow key={document.id} className="border-border hover:bg-muted/50">
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(document.id)}
                                                    onCheckedChange={(checked) => toggleOne(document.id, checked === true)}
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
                                            <TableCell>
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleRestore(document.id)}
                                                        disabled={processingId === document.id}
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                        Restore
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={() => setDocumentToDelete(document)}
                                                        disabled={processingId === document.id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete Permanently
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter className="bg-background">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableCell colSpan={3}>
                                            <div className="flex items-center gap-3">
                                                {selectedIds.length === 0 ? (
                                                    <span className="text-xs text-muted-foreground">
                                                        {documents.length} item{documents.length === 1 ? '' : 's'} in trash
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="text-xs font-medium text-foreground">
                                                            {selectedIds.length} selected
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleRestoreSelected}
                                                            disabled={isRestoringSelected}
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                            Restore Selected
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell colSpan={3} className="text-right">
                                            <button
                                                type="button"
                                                onClick={() => setShowEmptyTrashDialog(true)}
                                                className="text-sm text-destructive transition-colors hover:underline"
                                            >
                                                Empty Trash
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={documentToDelete !== null} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Permanently</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. The document and its encrypted file will be permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDocumentToDelete(null)}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handlePermanentDelete}
                        >
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEmptyTrashDialog} onOpenChange={setShowEmptyTrashDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Empty Trash</DialogTitle>
                        <DialogDescription>
                            This will permanently delete all {documents.length} documents in your trash. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setShowEmptyTrashDialog(false)}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleEmptyTrash}>
                            Delete Permanently
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AuthenticatedLayout>
    );
}
