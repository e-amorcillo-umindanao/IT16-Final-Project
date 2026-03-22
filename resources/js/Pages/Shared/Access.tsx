import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head } from '@inertiajs/react';
import { format } from 'date-fns';
import { Calendar, Clock3, File, FileText, FileType, Image as ImageIcon, Lock, ShieldCheck, Sheet } from 'lucide-react';

interface SharedAccessDocument {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    description: string | null;
    created_at: string;
    owner_name: string;
}

interface Props {
    document: SharedAccessDocument;
    expiresAt: string | null;
}

function formatBytes(bytes: number) {
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

    if (normalized.includes('pdf')) return FileText;
    if (normalized.includes('word') || normalized.includes('officedocument.wordprocessingml.document')) return FileType;
    if (normalized.includes('sheet') || normalized.includes('excel') || normalized.includes('spreadsheetml')) return Sheet;
    if (normalized.includes('image/')) return ImageIcon;

    return File;
}

export default function SharedAccess({ document, expiresAt }: Props) {
    const FileIcon = getFileIcon(document.mime_type);

    return (
        <GuestLayout>
            <Head title={`Shared Access - ${document.original_name}`} />

            <div className="w-full max-w-3xl px-4 py-12 sm:px-6">
                <Card className="overflow-hidden rounded-3xl border-border shadow-xl">
                    <div className="h-1.5 bg-primary" />
                    <CardHeader className="space-y-4 pb-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/10 text-primary">
                                <Lock className="h-3.5 w-3.5" />
                                Read-Only Shared Link
                            </Badge>
                            {expiresAt && (
                                <Badge variant="outline" className="gap-1">
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Expires {format(new Date(expiresAt), 'PPP p')}
                                </Badge>
                            )}
                        </div>
                        <CardTitle className="text-2xl text-foreground">SecureVault Shared Document</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-start gap-4 rounded-2xl border border-border bg-background p-5">
                            <div className="rounded-2xl bg-primary/10 p-3">
                                <FileIcon className="h-10 w-10 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="truncate text-xl font-semibold text-foreground">{document.original_name}</h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Shared by {document.owner_name} for view-only access.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-2xl border border-border bg-background p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">File Size</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{formatBytes(document.file_size)}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-background p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Uploaded</p>
                                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {format(new Date(document.created_at), 'PPP')}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-border bg-background p-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Protection</p>
                                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    Read-only session
                                </p>
                            </div>
                        </div>

                        {document.description && (
                            <div className="rounded-2xl border border-border bg-background p-5">
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Description</p>
                                <p className="mt-3 text-sm leading-6 text-foreground">{document.description}</p>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button variant="outline" asChild>
                                <a href={route('login')}>Sign in to your vault</a>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </GuestLayout>
    );
}
