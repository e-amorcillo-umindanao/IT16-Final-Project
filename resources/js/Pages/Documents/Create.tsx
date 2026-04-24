import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileTypeBadge } from '@/components/FileTypeBadge';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { consumePendingUpload } from '@/lib/pendingUpload';
import { Head, Link, router, useForm } from '@inertiajs/react';
import confetti from 'canvas-confetti';
import {
    AlertTriangle,
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
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';

interface Props {
    maxSize: number;
    allowedMimes: string[];
    isFirstDocument: boolean;
}

type ValidationError = 'type' | 'size' | null;

const FALLBACK_ACCEPTED_MIMES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
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
        normalized.includes('image/png') ||
        normalized.includes('image/webp')
    ) {
        return <ImageIcon className="h-8 w-8 text-primary" />;
    }

    return <File className="h-8 w-8 text-primary" />;
}

export default function Create({ maxSize, allowedMimes, isFirstDocument }: Props) {
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
            return 'Only PDF, DOCX, XLSX, JPG, PNG, and WebP files are allowed.';
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

    useEffect(() => {
        const pendingFile = consumePendingUpload();

        if (pendingFile) {
            handleSelectedFile(pendingFile);
        }
        // We only want to hydrate a pending file once on page load.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            onSuccess: () => {
                if (isFirstDocument) {
                    confetti({
                        particleCount: 120,
                        spread: 80,
                        origin: { y: 0.6 },
                        colors: ['#D4A843', '#B8860B', '#FFD700', '#FFF8DC', '#111111'],
                    });
                }
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold leading-tight text-foreground">Upload Document</h2>
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/dashboard">Main</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/documents">My Vault</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage>Upload</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            }
        >
            <Head title="Upload Document" />

            <div className="py-10">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <Card className="border-border bg-card">
                        <CardHeader className="space-y-3">
                            <CardTitle className="text-2xl font-semibold text-foreground">Secure Upload</CardTitle>
                            <CardDescription>
                                Your document will be encrypted with{' '}
                                <strong className="font-semibold text-primary">AES-256-CBC</strong> before being stored.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
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
                                        aria-label="Choose a document to upload"
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
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="max-w-xs truncate text-sm font-medium text-foreground"
                                                            title={data.document.name}
                                                        >
                                                            {data.document.name}
                                                        </span>
                                                        <FileTypeBadge mimeType={data.document.type} />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatBytes(data.document.size)}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        clearSelection();
                                                    }}
                                                    disabled={processing}
                                                    aria-label="Clear selected file"
                                                >
                                                    <X className="h-4 w-4" />
                                                    <span className="sr-only">Clear selected file</span>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="mb-4 cursor-help rounded-lg bg-muted p-3">
                                                                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Max file size: 10 MB</p>
                                                            <p>Accepted: PDF, DOCX, XLSX, JPG, PNG</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <p className="font-medium text-foreground">Click or drag file to upload</p>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    PDF, DOCX, XLSX, JPG, or PNG up to 10 MB
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {processing && progress && (
                                        <div className="space-y-1.5">
                                            <Progress value={progress.percentage} className="h-1" />
                                            <p className="text-right text-xs text-muted-foreground">
                                                {progress.percentage}% uploaded
                                            </p>
                                        </div>
                                    )}

                                    {fileErrorMessage && (
                                        <Alert variant="destructive">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertDescription>{fileErrorMessage}</AlertDescription>
                                        </Alert>
                                    )}
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <Label htmlFor="description">
                                        Description{' '}
                                        <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                                    </Label>
                                    <Textarea
                                        id="description"
                                        rows={3}
                                        maxLength={500}
                                        placeholder="Add a note about this document..."
                                        value={data.description}
                                        onChange={(event) => setData('description', event.target.value)}
                                        className="resize-none bg-background"
                                    />
                                    <div className="text-right">
                                        <span className="text-xs text-muted-foreground">{data.description.length}/500</span>
                                    </div>
                                    {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                                </div>

                                <Separator />

                                <Alert className="border-primary/20 bg-primary/10">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    <AlertDescription>
                                        <span className="block text-sm font-medium text-foreground">
                                            End-to-end encryption active
                                        </span>
                                        <span className="text-xs font-medium tracking-wide text-primary">
                                            AES-256-CBC · SHA-256 Integrity Verification
                                        </span>
                                    </AlertDescription>
                                </Alert>

                                <div className="flex items-center justify-between gap-4 pt-2">
                                    <Button
                                        type="submit"
                                        disabled={!canSubmit}
                                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Encrypt & Upload Now
                                            </>
                                        ) : (
                                            <>
                                                <LockKeyhole className="h-4 w-4" />
                                                Encrypt & Upload Now
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="text-muted-foreground"
                                        onClick={() => router.visit(route('documents.index'))}
                                        disabled={processing}
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
