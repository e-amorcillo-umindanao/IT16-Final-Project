import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, FileIcon, Loader2, RefreshCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    documents: {
        data: any[];
        links: any[];
    };
}

export default function Trash({ documents }: Props) {
    const [actionId, setActionId] = useState<number | null>(null);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + ['Bytes', 'KB', 'MB', 'GB'][i];
    };

    const handleRestore = (id: number) => {
        setActionId(id);
        router.post(route('documents.restore', id), {}, {
            onFinish: () => setActionId(null),
        });
    };

    const handleForceDelete = (id: number) => {
        if (confirm('CRITICAL: This will permanently delete the file from our servers. This action cannot be undone. Proceed?')) {
            setActionId(id);
            router.delete(route('documents.force-delete', id), {
                onFinish: () => setActionId(null),
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-foreground">
                    Trash
                </h2>
            }
        >
            <Head title="Trash" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    <Alert className="border-[#3F2E11] bg-[#2A2010] text-primary">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <AlertTitle>Notice</AlertTitle>
                        <AlertDescription>
                            Documents in the trash will be permanently deleted after 30 days. No recovery is possible after that.
                        </AlertDescription>
                    </Alert>

                    <Card>
                        {documents.data.length === 0 ? (
                            <CardContent className="flex h-64 flex-col items-center justify-center text-center text-muted-foreground">
                                <Trash2 className="mb-4 h-12 w-12 opacity-15" />
                                <p className="text-lg font-medium">Trash is empty</p>
                                <p className="text-sm">Great job keeping things tidy!</p>
                            </CardContent>
                        ) : (
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[400px]">Name</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead>Deleted On</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documents.data.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                                                        <span className="max-w-[300px] truncate font-medium text-foreground" title={doc.original_name}>
                                                            {doc.original_name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatBytes(doc.file_size)}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {formatDistanceToNow(new Date(doc.deleted_at), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-primary text-primary hover:bg-accent"
                                                            onClick={() => handleRestore(doc.id)}
                                                            disabled={actionId === doc.id}
                                                        >
                                                            {actionId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-1" />}
                                                            Restore
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-[#F87171] hover:bg-[rgba(179,58,58,0.1)] hover:text-[#F87171]"
                                                            onClick={() => handleForceDelete(doc.id)}
                                                            disabled={actionId === doc.id}
                                                        >
                                                            {actionId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                                                            Purge
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
