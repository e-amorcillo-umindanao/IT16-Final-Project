import InputError from '@/components/InputError';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { FileDown, FileIcon, Loader2, Lock, ShieldCheck, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';

interface Props {
    maxSize: number;
    allowedMimes: string[];
}

export default function UploadPage({ maxSize, allowedMimes }: Props) {
    const [dragActive, setDragActive] = useState(false);
    const { data, setData, post, processing, errors, progress, reset } = useForm({
        file: null as File | null,
    });

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleFile = (file: File) => {
        if (file.size > maxSize) {
            alert(`File too large. Maximum size is ${formatBytes(maxSize)}.`);
            return;
        }
        setData('file', file);
    };

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, []);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('documents.store'), {
            forceFormData: true,
            onError: () => console.log('Upload failed'),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-foreground">
                    Upload & Encrypt
                </h2>
            }
        >
            <Head title="Upload Document" />

            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Secure Upload</CardTitle>
                            <CardDescription>
                                Your document will be encrypted with AES-256-CBC before being stored in our private vault.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-6">
                                {!data.file ? (
                                    <div
                                        className={`relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                                            dragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary'
                                        }`}
                                        onDragOver={onDragOver}
                                        onDragLeave={onDragLeave}
                                        onDrop={onDrop}
                                        onClick={() => document.getElementById('file-input')?.click()}
                                    >
                                        <Upload className={`mb-4 h-12 w-12 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <div className="text-center">
                                            <p className="text-lg font-medium text-foreground">Click or drag file to upload</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                PDF, DOCX, XLSX, JPG, or PNG up to {formatBytes(maxSize)}
                                            </p>
                                        </div>
                                        <input
                                            id="file-input"
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                            accept={allowedMimes.join(',')}
                                        />
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-border bg-card p-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="rounded-full bg-accent p-3">
                                                    <FileIcon className="h-8 w-8 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-foreground">{data.file.name}</p>
                                                    <p className="text-sm text-muted-foreground">{formatBytes(data.file.size)} • {data.file.type}</p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setData('file', null)}
                                                disabled={processing}
                                            >
                                                <X className="h-5 w-5 text-muted-foreground" />
                                            </Button>
                                        </div>

                                        {progress && (
                                            <div className="mt-6 space-y-2">
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                                    <div
                                                        className="h-full bg-primary transition-all duration-300"
                                                        style={{ width: `${progress.percentage}%` }}
                                                    />
                                                </div>
                                                <p className="text-right text-xs font-medium text-muted-foreground">{progress.percentage}% uploaded</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <InputError message={errors.file} className="mt-2" />

                                <div className="flex flex-col items-center justify-center gap-4 border-t border-border pt-4">
                                    <div className="flex items-center gap-2 text-sm font-medium text-[#4ADE80]">
                                        <ShieldCheck className="h-5 w-5" />
                                        End-to-end encryption active
                                    </div>
                                    <Button
                                        type="submit"
                                        className="w-full py-6 text-lg"
                                        disabled={!data.file || processing}
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Encrypting & Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="mr-2 h-5 w-5" />
                                                Encrypt & Upload Now
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-muted-foreground"
                                        disabled={processing}
                                        onClick={() => router.get(route('documents.index'))}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
