import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { useToast } from '../../components/ui/use-toast';
import { Loader2, Pencil, Upload } from 'lucide-react';
import type { User } from '../../types';

export default function UserManagement() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Fetch Users
    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('users')
                .select('*');
            if (error) throw error;
            return data as User[];
        },
    });

    // Update User Mutation
    const updateMutation = useMutation({
        mutationFn: async (vars: { id: string; full_name: string; role: string; signature_url?: string }) => {
            const { error } = await supabase
                .from('users')
                .update({
                    full_name: vars.full_name,
                    role: vars.role as any,
                    signature_url: vars.signature_url
                })
                .eq('id', vars.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setIsDialogOpen(false);
            toast({ title: 'Berhasil', description: 'Data user berhasil diperbarui' });
        },
        onError: (error: any) => {
            toast({
                variant: 'destructive',
                title: 'Gagal',
                description: error.message || 'Terjadi kesalahan saat menyimpan data',
            });
        },
    });

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Manajemen User</h1>
                <div className="text-sm text-muted-foreground">
                    Total: {users?.length || 0} User
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Nama Lengkap</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Tanda Tangan</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>{user.email}</TableCell>
                                <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                        ${user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                            user.role === 'guru' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'}`}>
                                        {user.role.toUpperCase()}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {user.signature_url ? (
                                        <img src={user.signature_url} alt="Sig" className="h-8 w-16 object-contain border rounded bg-white" />
                                    ) : (
                                        <span className="text-xs text-gray-400">Belum ada</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                            setSelectedUser(user);
                                            setIsDialogOpen(true);
                                        }}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <UserEditDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                user={selectedUser}
                onSave={(data) => {
                    if (selectedUser) {
                        updateMutation.mutate({ id: selectedUser.id, ...data });
                    }
                }}
                isSaving={updateMutation.isPending}
            />
        </div>
    );
}

function UserEditDialog({ open, onOpenChange, user, onSave, isSaving }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: User | null;
    onSave: (data: { full_name: string; role: string; signature_url?: string }) => void;
    isSaving: boolean;
}) {
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('');
    const [signatureUrl, setSignatureUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset form when user changes
    useEffect(() => {
        if (user) {
            setFullName(user.full_name || '');
            setRole(user.role);
            setSignatureUrl(user.signature_url || '');
        }
    }, [user?.id]); // Only re-run when user ID changes

    const handleFileUpload = async (file: File) => {
        if (!file) return;
        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `sig_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('raport-assets')
                .upload(fileName, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('raport-assets')
                .getPublicUrl(fileName);

            setSignatureUrl(publicUrl);
        } catch (e: any) {
            alert('Gagal upload: ' + e.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                        Ubah informasi user, role, dan upload tanda tangan.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user?.email || ''} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label>Nama Lengkap</Label>
                        <Input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Nama Guru / Admin"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Tanda Tangan</Label>
                        <div className="flex items-center gap-4">
                            {signatureUrl ? (
                                <img src={signatureUrl} className="h-12 w-24 object-contain border rounded" />
                            ) : (
                                <div className="h-12 w-24 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">No Sig</div>
                            )}
                            <div className="flex-1">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    disabled={isUploading}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {isUploading ? 'Uploading...' : 'Upload Baru'}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="viewer">Viewer (Wali Santri)</SelectItem>
                                <SelectItem value="guru">Guru</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
                    <Button
                        onClick={() => onSave({ full_name: fullName, role, signature_url: signatureUrl })}
                        disabled={isSaving || isUploading}
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Simpan
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

