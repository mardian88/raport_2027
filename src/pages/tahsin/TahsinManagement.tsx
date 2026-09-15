import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { TahsinMaster, Halaqah } from '../../types';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Plus, Trash2, GripVertical, Filter, Save } from 'lucide-react';
import { useToast } from '../../components/ui/use-toast';
import { Checkbox } from '../../components/ui/checkbox';

export default function TahsinManagement() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [newItemName, setNewItemName] = useState('');
    const [selectedHalaqah, setSelectedHalaqah] = useState<string>('all'); // 'all', 'global', or halaqah_id
    const [newItemHalaqah, setNewItemHalaqah] = useState<string>('global'); // For adding new items

    // Delegation State
    const [delegationHalaqah, setDelegationHalaqah] = useState<string>('');
    const [delegationItems, setDelegationItems] = useState<string[]>([]);

    // Fetch Halaqah list
    const { data: halaqahList } = useQuery({
        queryKey: ['halaqah_list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('halaqah')
                .select('*')
                .eq('is_active', true)
                .order('nama');
            if (error) throw error;
            return data as Halaqah[];
        }
    });

    // Fetch Tahsin items with filter
    const { data: tahsinItems, isLoading } = useQuery({
        queryKey: ['tahsin_master', selectedHalaqah],
        queryFn: async () => {
            let query = supabase
                .from('tahsin_master')
                .select('*')
                .order('urutan');

            if (selectedHalaqah === 'global') {
                query = query.is('halaqah_id', null);
            } else if (selectedHalaqah !== 'all') {
                query = query.eq('halaqah_id', selectedHalaqah);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as TahsinMaster[];
        }
    });

    // Fetch items for delegation (Global + Selected Halaqah)
    const { data: availableItemsForDelegation } = useQuery({
        queryKey: ['tahsin_delegation', delegationHalaqah],
        enabled: !!delegationHalaqah,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tahsin_master')
                .select('*')
                .or(`halaqah_id.is.null,halaqah_id.eq.${delegationHalaqah}`)
                .eq('is_active', true)
                .order('urutan');
            if (error) throw error;
            return data as TahsinMaster[];
        }
    });

    // Fetch current configuration for selected Halaqah (Delegation)
    const { data: selectedHalaqahData } = useQuery({
        queryKey: ['halaqah_detail', delegationHalaqah],
        enabled: !!delegationHalaqah,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('halaqah')
                .select('tahsin_items')
                .eq('id', delegationHalaqah)
                .single();
            if (error) throw error;
            return data;
        }
    });

    // Sync delegation state when data loads
    useEffect(() => {
        if (selectedHalaqahData?.tahsin_items) {
            setDelegationItems(selectedHalaqahData.tahsin_items);
        } else {
            setDelegationItems([]);
        }
    }, [selectedHalaqahData]);

    // Add new item
    const addMutation = useMutation({
        mutationFn: async ({ nama, halaqah_id }: { nama: string; halaqah_id: string | null }) => {
            const maxUrutan = tahsinItems?.reduce((max, item) => Math.max(max, item.urutan), 0) || 0;
            const { error } = await supabase
                .from('tahsin_master')
                .insert([{
                    nama_item: nama,
                    urutan: maxUrutan + 1,
                    is_active: true,
                    halaqah_id: halaqah_id === 'global' ? null : halaqah_id
                }]);

            if (error) throw error;

            // Auto-activate for the specific Halaqah if applicable
            if (halaqah_id && halaqah_id !== 'global') {
                const { data: hData } = await supabase
                    .from('halaqah')
                    .select('tahsin_items')
                    .eq('id', halaqah_id)
                    .single();

                const currentItems = hData?.tahsin_items || [];
                // Avoid duplicates just in case
                if (!currentItems.includes(nama)) {
                    await supabase
                        .from('halaqah')
                        .update({ tahsin_items: [...currentItems, nama] })
                        .eq('id', halaqah_id);
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tahsin_master'] });
            queryClient.invalidateQueries({ queryKey: ['tahsin_master_active'] });
            setNewItemName('');
            toast({
                title: "Berhasil",
                description: "Item Tahsin berhasil ditambahkan",
                variant: "success"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    // Toggle active status
    const toggleMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase
                .from('tahsin_master')
                .update({ is_active })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tahsin_master'] });
            queryClient.invalidateQueries({ queryKey: ['tahsin_master_active'] });
            toast({
                title: "Berhasil",
                description: "Status item berhasil diubah",
                variant: "success"
            });
        }
    });

    // Delete item
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('tahsin_master')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tahsin_master'] });
            queryClient.invalidateQueries({ queryKey: ['tahsin_master_active'] });
            toast({
                title: "Berhasil",
                description: "Item Tahsin berhasil dihapus",
                variant: "success"
            });
        }
    });

    // Update order
    const updateOrderMutation = useMutation({
        mutationFn: async (items: TahsinMaster[]) => {
            const updates = items.map((item, index) => ({
                id: item.id,
                urutan: index + 1
            }));

            for (const update of updates) {
                await supabase
                    .from('tahsin_master')
                    .update({ urutan: update.urutan })
                    .eq('id', update.id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tahsin_master'] });
            queryClient.invalidateQueries({ queryKey: ['tahsin_master_active'] });
            toast({
                title: "Berhasil",
                description: "Urutan item berhasil diubah",
                variant: "success"
            });
        }
    });

    // Save Delegation Mutation
    const saveDelegationMutation = useMutation({
        mutationFn: async () => {
            if (!delegationHalaqah) return;
            const { error } = await supabase
                .from('halaqah')
                .update({ tahsin_items: delegationItems })
                .eq('id', delegationHalaqah);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['halaqah_list'] });
            toast({
                title: "Berhasil",
                description: "Konfigurasi halaqah berhasil disimpan",
                variant: "success"
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const moveItem = (index: number, direction: 'up' | 'down') => {
        if (!tahsinItems) return;

        const newItems = [...tahsinItems];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newItems.length) return;

        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        updateOrderMutation.mutate(newItems);
    };

    const getHalaqahName = (halaqah_id: string | null | undefined) => {
        if (!halaqah_id) return 'Global (Semua Halaqah)';
        const halaqah = halaqahList?.find(h => h.id === halaqah_id);
        return halaqah?.nama || 'Unknown';
    };

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Manajemen Item Tahsin</h1>
                <p className="text-gray-500">Kelola item-item penilaian Tahsin yang aktif per Halaqah</p>
            </div>

            {/* Filter */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filter Halaqah
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label>Tampilkan Item Untuk</Label>
                            <select
                                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                                value={selectedHalaqah}
                                onChange={(e) => setSelectedHalaqah(e.target.value)}
                            >
                                <option value="all">Semua Item</option>
                                <option value="global">Global (Default untuk semua Halaqah)</option>
                                {halaqahList?.map(h => (
                                    <option key={h.id} value={h.id}>{h.nama}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Add New Item */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Tambah Item Tahsin Baru
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <Label>Nama Item</Label>
                            <input
                                type="text"
                                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                                placeholder="Contoh: Hukum Ra"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter' && newItemName.trim()) {
                                        addMutation.mutate({
                                            nama: newItemName.trim(),
                                            halaqah_id: newItemHalaqah
                                        });
                                    }
                                }}
                            />
                        </div>
                        <div className="flex-1">
                            <Label>Untuk Halaqah</Label>
                            <select
                                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                                value={newItemHalaqah}
                                onChange={(e) => setNewItemHalaqah(e.target.value)}
                            >
                                <option value="global">Global (Semua Halaqah)</option>
                                {halaqahList?.map(h => (
                                    <option key={h.id} value={h.id}>{h.nama}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <Button
                                onClick={() => {
                                    if (newItemName.trim()) {
                                        addMutation.mutate({
                                            nama: newItemName.trim(),
                                            halaqah_id: newItemHalaqah
                                        });
                                    }
                                }}
                                disabled={!newItemName.trim() || addMutation.isPending}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Tambah
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delegation Section */}
            <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-800">
                        <Filter className="h-5 w-5" />
                        Delegasi Penilaian Tahsin
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Pilih Halaqah untuk Dikonfigurasi</Label>
                        <select
                            className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                            value={delegationHalaqah}
                            onChange={(e) => setDelegationHalaqah(e.target.value)}
                        >
                            <option value="">-- Pilih Halaqah --</option>
                            {halaqahList?.map(h => (
                                <option key={h.id} value={h.id}>{h.nama}</option>
                            ))}
                        </select>
                    </div>

                    {delegationHalaqah && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="border rounded-md p-4 bg-white">
                                <Label className="mb-3 block">Item Penilaian Aktif:</Label>
                                {availableItemsForDelegation && availableItemsForDelegation.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {availableItemsForDelegation.map((item) => (
                                            <div key={item.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`del-${item.id}`}
                                                    checked={delegationItems.includes(item.nama_item)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setDelegationItems([...delegationItems, item.nama_item]);
                                                        } else {
                                                            setDelegationItems(delegationItems.filter(i => i !== item.nama_item));
                                                        }
                                                    }}
                                                />
                                                <label
                                                    htmlFor={`del-${item.id}`}
                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                >
                                                    {item.nama_item}
                                                    {item.halaqah_id && <span className="ml-1 text-xs text-blue-600">(Khusus)</span>}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">Tidak ada item aktif yang tersedia.</p>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    onClick={() => saveDelegationMutation.mutate()}
                                    disabled={saveDelegationMutation.isPending}
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Simpan Konfigurasi Halaqah
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* List of Items */}
            <Card>
                <CardHeader>
                    <CardTitle>Daftar Item Tahsin</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {tahsinItems && tahsinItems.length > 0 ? (
                            tahsinItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-4 p-3 border rounded-lg ${item.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'
                                        }`}
                                >
                                    {/* Drag Handle & Order Controls */}
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0}
                                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                        >
                                            ▲
                                        </button>
                                        <GripVertical className="h-4 w-4 text-gray-400" />
                                        <button
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === tahsinItems.length - 1}
                                            className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                        >
                                            ▼
                                        </button>
                                    </div>

                                    {/* Item Number */}
                                    <div className="w-8 text-center font-bold text-gray-500">
                                        {index + 1}
                                    </div>

                                    {/* Item Name & Halaqah */}
                                    <div className="flex-1">
                                        <p className="font-medium">{item.nama_item}</p>
                                        <p className="text-xs text-gray-500">{getHalaqahName(item.halaqah_id)}</p>
                                    </div>

                                    {/* Active Toggle */}
                                    <div className="flex items-center gap-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={item.is_active}
                                                onChange={(e) =>
                                                    toggleMutation.mutate({
                                                        id: item.id,
                                                        is_active: e.target.checked
                                                    })
                                                }
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                        <span className="text-sm text-gray-600">
                                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </div>

                                    {/* Delete Button */}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm(`Hapus item "${item.nama_item}"?`)) {
                                                deleteMutation.mutate(item.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-8">
                                {selectedHalaqah === 'all'
                                    ? 'Belum ada item Tahsin'
                                    : `Belum ada item Tahsin untuk filter ini`}
                            </p>
                        )}
                    </div>

                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Catatan:</strong>
                        </p>
                        <ul className="text-sm text-blue-800 list-disc list-inside mt-2 space-y-1">
                            <li>Item <strong>Global</strong> akan muncul untuk semua Halaqah</li>
                            <li>Item <strong>per-Halaqah</strong> hanya muncul untuk Halaqah yang dipilih</li>
                            <li>Item yang dinonaktifkan tidak akan muncul di form input raport</li>
                            <li>Gunakan tombol ▲▼ untuk mengubah urutan item</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

