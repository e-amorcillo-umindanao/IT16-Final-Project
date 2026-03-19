import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { Download, FileIcon, History, Info, Lock, Share2, Shield, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
    document: any;
    auditLogs: any[];
    authUserId: number;
}

export default function Show({ document: doc, auditLogs, authUserId }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        permission: 'view_only' as 'view_only' | 'download' | 'full_access',
        expires_at: '',
    });

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to move this document to trash?')) {
            router.delete(route('documents.destroy', doc.id));
        }
    };

    const copyHash = async () => {
        try {
            await navigator.clipboard.writeText(doc.file_hash);
            toast.success('Hash copied to clipboard');
        } catch {
            toast.error('Unable to copy hash');
        }
    };

    const getActivityBadgeClass = (action: string) => {
        const variants: Record<string, string> = {
            document_uploaded: 'border-[#3F2E11] bg-[#2A2010] text-primary',
            document_downloaded: 'border-[#1E3A24] bg-[#132B1A] text-[#4ADE80]',
            document_shared: 'border-[#17304F] bg-[#0F1B2D] text-[#60A5FA]',
            share_revoked: 'border-[#17304F] bg-[#0F1B2D] text-[#60A5FA]',
            document_deleted: 'border-[#5A2020] bg-[#2D1010] text-[#F87171]',
            document_restored: 'border-[#1E3A24] bg-[#132B1A] text-[#4ADE80]',
            integrity_violation: 'border-[#5A2020] bg-[#2D1010] text-[#F87171]',
        };

        return variants[action] ?? 'border-border bg-secondary text-muted-foreground';
    };

    const getActivityLabel = (action: string) =>
        action
            .replaceAll('_', ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());

    const truncatedHash = `${doc.file_hash.slice(0, 16)}...`;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.get(route('documents.index'))}>
                            &larr; Back
                        </Button>
                        <h2 className="text-xl font-semibold leading-tight text-foreground">
                            Document Details
                        </h2>
                    </div>
                    <div className="flex gap-3">
                        <a href={route('documents.download', doc.id)} download>
                            <Button className="bg-[#D4A843] text-[#0A0A0A] hover:bg-[#E0B84D]">
                                <Download className="mr-2 h-4 w-4" /> Download
                            </Button>
                        </a>
                        <Button variant="destructive" onClick={handleDelete}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                    </div>
                </div>
            }
        >
            <Head title={`View - ${doc.original_name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Meta Info */}
                        <div className="md:col-span-2 space-y-6">
                            <Card>
                                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                    <div className="flex items-center gap-4">
                                        <div className="rounded-lg border border-border bg-accent p-4">
                                            <FileIcon className="h-10 w-10 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl">{doc.original_name}</CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="border-[#1E3A24] bg-[#132B1A] text-[#4ADE80]">
                                                    <Lock className="h-3 w-3 mr-1" /> Fully Encrypted
                                                </Badge>
                                                <span>{doc.mime_type}</span>
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-6 border-t border-border py-6 font-medium lg:grid-cols-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">File Size</p>
                                        <p className="text-sm">{formatBytes(doc.file_size)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Uploaded By</p>
                                        <p className="text-sm">{doc.user.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Uploaded On</p>
                                        <p className="text-sm">{format(new Date(doc.created_at), 'PPP')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs text-muted-foreground" title="Used to verify the file has not been altered.">
                                                Integrity Hash
                                            </p>
                                            <span title="Used to verify the file has not been altered.">
                                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 whitespace-nowrap">
                                            <p className="min-w-0 truncate font-mono text-xs text-foreground" title={doc.file_hash}>
                                                {truncatedHash}
                                            </p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 shrink-0 px-2 text-[11px]"
                                                onClick={copyHash}
                                            >
                                                Copy hash
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Activity */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <History className="h-5 w-5 text-primary" />
                                        Recent Activity
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="border-t border-border p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Action</TableHead>
                                                <TableHead>Time</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {auditLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-sm font-medium">{log.user?.name || 'System'}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[11px] ${getActivityBadgeClass(log.action)}`}
                                                        >
                                                            {getActivityLabel(log.action)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {auditLogs.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                                                        No recent activity recorded.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sharing Sidebar */}
                        <div className="space-y-6">
                            {(authUserId === doc.user_id || doc.shares.find((s: any) => s.shared_with_id === authUserId && s.permission === 'full_access')) && (
                                <Card>
                                    <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                            <Share2 className="h-5 w-5 text-primary" />
                                            Share Document
                                        </CardTitle>
                                        <CardDescription>Grant access to other registered users.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={(e) => { e.preventDefault(); post(route('shares.store', doc.id), { onSuccess: () => reset() }); }} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="email">User Email</Label>
                                                <Input 
                                                    id="email" 
                                                    type="email" 
                                                    placeholder="colleague@university.edu" 
                                                    value={data.email}
                                                    onChange={e => setData('email', e.target.value)}
                                                    required
                                                />
                                                {errors.email && <p className="text-xs font-medium text-[#F87171]">{errors.email}</p>}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="permission">Permission Level</Label>
                                                <Select value={data.permission} onValueChange={val => setData('permission', val as any)}>
                                                    <SelectTrigger id="permission">
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
                                                <Label htmlFor="expires_at">Expiry (Optional)</Label>
                                                <Input 
                                                    id="expires_at" 
                                                    type="date" 
                                                    value={data.expires_at}
                                                    onChange={e => setData('expires_at', e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                            <Button className="w-full" type="submit" disabled={processing}>
                                                <UserPlus className="mr-2 h-4 w-4" /> 
                                                {processing ? 'Sharing...' : 'Grant Access'}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            )}

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-primary" />
                                        Access Control
                                    </CardTitle>
                                    <CardDescription>Users who have access to this file.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 border-t border-border p-0">
                                    <div className="divide-y">
                                        {doc.shares.length === 0 ? (
                                            <div className="p-8 text-center text-sm text-muted-foreground">
                                                Not shared with anyone yet.
                                            </div>
                                        ) : (
                                            doc.shares.map((share: any) => (
                                                <div key={share.id} className="p-4 flex items-center justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-foreground">{share.shared_with.name}</p>
                                                        <p className="truncate text-xs text-muted-foreground">{share.shared_with.email}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            <Badge variant="outline" className="text-[10px] uppercase py-0 px-1 leading-tight">
                                                                {share.permission.replace('_', ' ')}
                                                            </Badge>
                                                            {share.expires_at && (
                                                                <Badge variant="outline" className="border-[#3F2E11] bg-[#2A2010] px-1 py-0 text-[10px] leading-tight text-primary">
                                                                    Expires {format(new Date(share.expires_at), 'MMM d')}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {(authUserId === doc.user_id || authUserId === share.shared_by_id) && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-muted-foreground hover:text-[#F87171]"
                                                            onClick={() => confirm('Revoke access for this user?') && router.delete(route('shares.destroy', share.id))}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
