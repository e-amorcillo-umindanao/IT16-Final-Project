import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    File,
    FileText,
    FileType,
    Image as ImageIcon,
    Loader2,
    LockKeyhole,
    ShieldCheck,
    Sheet,
    UploadCloud,
    X,
} from 'lucide-react';
import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react';

interface Props {
    maxSize: number;
    allowedMimes: string[];
}

type ValidationError = 'type' | 'size' | null;

const FALLBACK_ACCEPTED_MIMES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
];

function formatBytes(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
    const normalized = mimeType.toLowerCase();

    if (normalized.includes('pdf')) {
        return <FileText className="h-8 w-8 text-primary" />;
    }

    if (
        normalized.includes('word') ||
        normalized.includes('officedocument.wordprocessingml.document') ||
        normalized.includes('msword')
    ) {
        return <FileType className="h-8 w-8 text-primary" />;
    }

    if (
        normalized.includes('sheet') ||
        normalized.includes('excel') ||
        normalized.includes('spreadsheetml')
    ) {
        return <Sheet className="h-8 w-8 text-primary" />;
    }

    if (
        normalized.includes('image/jpeg') ||
        normalized.includes('image/jpg') ||
        normalized.includes('image/png')
    ) {
        return <ImageIcon className="h-8 w-8 text-primary" />;
    }

    return <File className="h-8 w-8 text-primary" />;
}

export default function Create({ maxSize, allowedMimes }: Props) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [clientError, setClientError] = useState<ValidationError>(null);

    const acceptedMimes = allowedMimes.length > 0 ? allowedMimes : FALLBACK_ACCEPTED_MIMES;

    const { data, setData, post, processing, errors, progress } = useForm({
        document: null as File | null,
        description: '',
    });

    const fileErrorMessage = useMemo(() => {
        if (clientError === 'type') {
            return 'Only PDF, DOCX, XLSX, JPG, and PNG files are allowed.';
        }

        if (clientError === 'size') {
            return 'File size must not exceed 10 MB.';
        }

        return errors.document ?? null;
    }, [clientError, errors.document]);

    const hasValidationError = clientError !== null;
    const canSubmit = data.document !== null && !hasValidationError && !processing;

    const validateFile = (file: File): ValidationError => {
        if (!acceptedMimes.includes(file.type)) {
            return 'type';
        }

        if (file.size > maxSize) {
            return 'size';
        }

        return null;
    };

    const handleSelectedFile = (file: File) => {
        const validationError = validateFile(file);
        setClientError(validationError);
        setData('document', file);
    };

    const clearSelection = () => {
        setData('document', null);
        setClientError(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const openFilePicker = () => {
        if (!processing) {
            fileInputRef.current?.click();
        }
    };

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (file) {
            handleSelectedFile(file);
        }
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (!processing) {
            setDragActive(true);
        }
    };

    const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragActive(false);
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        setDragActive(false);

        if (processing) {
            return;
        }

        const file = event.dataTransfer.files?.[0];

        if (file) {
            handleSelectedFile(file);
        }
    };

    const submit = () => {
        if (!canSubmit) {
            return;
        }

        post(route('documents.store'), {
            forceFormData: true,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold leading-tight text-foreground">Upload Document</h2>
                    <p className="text-sm text-muted-foreground">
                        Main &#8250; <Link href={route('documents.index')} className="hover:text-foreground">My Vault</Link> &#8250; Upload
                    </p>
                </div>
            }
        >
            <Head title="Upload Document" />

            <div className="py-10">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <Card className="border-border bg-card">
                        <CardHeader className="space-y-3">
                            <CardTitle className="text-2xl font-semibold text-foreground">Secure Upload</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Your document will be encrypted with{' '}
                                <span className="font-semibold text-primary">AES-256-CBC</span> before being stored.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    submit();
                                }}
                                className="space-y-6"
                            >
                                <div className="space-y-3">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept={acceptedMimes.join(',')}
                                        onChange={handleInputChange}
                                    />

                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={openFilePicker}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                openFilePicker();
                                            }
                                        }}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`rounded-lg border p-6 transition-colors ${
                                            data.document
                                                ? 'border-border bg-background'
                                                : dragActive
                                                  ? 'border-primary bg-primary/5'
                                                  : 'border-2 border-dashed border-border bg-background'
                                        } ${processing ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                                    >
                                        {data.document ? (
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
                                                    {getFileIcon(data.document.type)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className="max-w-xs truncate font-medium text-foreground"
                                                        title={data.document.name}
                                                    >
                                                        {data.document.name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatBytes(data.document.size)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        clearSelection();
                                                    }}
                                                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    disabled={processing}
                                                >
                                                    <X className="h-4 w-4" />
                                                    <span className="sr-only">Clear selected file</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                <div className="mb-4 rounded-lg bg-muted p-3">
                                                    <UploadCloud className="h-10 w-10 text-primary" />
                                                </div>
                                                <p className="font-medium text-foreground">Click or drag file to upload</p>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    PDF, DOCX, XLSX, JPG, or PNG up to 10 MB
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {processing && progress && (
                                        <div className="overflow-hidden rounded-full bg-muted">
                                            <div
                                                className="h-1 rounded-full bg-primary transition-all"
                                                style={{ width: `${progress.percentage}%` }}
                                            />
                                        </div>
                                    )}

                                    {fileErrorMessage && <p className="text-sm text-destructive">{fileErrorMessage}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="description" className="text-sm font-medium text-foreground">
                                        Description <span className="text-muted-foreground">(optional)</span>
                                    </label>
                                    <Textarea
                                        id="description"
                                        rows={3}
                                        maxLength={500}
                                        placeholder="Add a note about this document..."
                                        value={data.description}
                                        onChange={(event) => setData('description', event.target.value)}
                                        className="bg-background"
                                    />
                                    <div className="flex justify-end">
                                        <p className="text-xs text-muted-foreground">{data.description.length}/500</p>
                                    </div>
                                    {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                                </div>

                                <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-full bg-primary/20 p-1.5">
                                            <ShieldCheck className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-foreground">
                                                End-to-end encryption active
                                            </p>
                                            <p className="text-xs font-medium tracking-wide text-primary">
                                                AES-256-CBC &middot; SHA-256 Integrity Verification
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    <Button
                                        type="submit"
                                        disabled={!canSubmit}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Encrypt & Upload Now
                                            </>
                                        ) : (
                                            <>
                                                <LockKeyhole className="mr-2 h-4 w-4" />
                                                Encrypt & Upload Now
                                            </>
                                        )}
                                    </Button>

                                    <button
                                        type="button"
                                        onClick={() => router.visit(route('documents.index'))}
                                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                        disabled={processing}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
