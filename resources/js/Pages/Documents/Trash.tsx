import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Trash Bin
                </h2>
            }
        >
            <Head title="Trash" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Notice</AlertTitle>
                        <AlertDescription>
                            Documents in the trash will be permanently deleted after 30 days. No recovery is possible after that.
                        </AlertDescription>
                    </Alert>

                    <Card>
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
                                    {documents.data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-64 text-center">
                                                <div className="flex flex-col items-center justify-center text-gray-500">
                                                    <Trash2 className="mb-4 h-12 w-12 opacity-10" />
                                                    <p className="text-lg font-medium">Trash is empty</p>
                                                    <p className="text-sm">Great job keeping things tidy!</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.data.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <FileIcon className="h-5 w-5 text-gray-400" />
                                                        <span className="font-medium text-gray-900 truncate max-w-[300px]" title={doc.original_name}>
                                                            {doc.original_name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-gray-600 text-sm">
                                                    {formatBytes(doc.file_size)}
                                                </TableCell>
                                                <TableCell className="text-gray-600 text-sm">
                                                    {formatDistanceToNow(new Date(doc.deleted_at), { addSuffix: true })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                                            onClick={() => handleRestore(doc.id)}
                                                            disabled={actionId === doc.id}
                                                        >
                                                            {actionId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-1" />}
                                                            Restore
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleForceDelete(doc.id)}
                                                            disabled={actionId === doc.id}
                                                        >
                                                            {actionId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                                                            Purge
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
