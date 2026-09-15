import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { AcademicYear, Semester } from '../../types';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Plus, Check, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Academic() {
    const queryClient = useQueryClient();
    const [newYear, setNewYear] = useState('');

    const { data: academicYears, isLoading } = useQuery({
        queryKey: ['academic_years'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('academic_years')
                .select('*, semesters(*)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            // Sort semesters by created_at or name
            const sorted = (data as (AcademicYear & { semesters: Semester[] })[]).map(y => ({
                ...y,
                semesters: y.semesters.sort((a, b) => a.nama.localeCompare(b.nama))
            }));
            return sorted;
        },
    });

    const addYearMutation = useMutation({
        mutationFn: async (tahun_ajaran: string) => {
            const { data, error } = await supabase
                .from('academic_years')
                .insert([{ tahun_ajaran, is_active: false }])
                .select()
                .single();
            if (error) throw error;

            // Auto create Ganjil & Genap semesters
            if (data) {
                await supabase.from('semesters').insert([
                    { academic_year_id: data.id, nama: 'Ganjil', is_active: false },
                    { academic_year_id: data.id, nama: 'Genap', is_active: false },
                ]);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academic_years'] });
            setNewYear('');
        },
    });

    const activateSemesterMutation = useMutation({
        mutationFn: async ({ semesterId, yearId }: { semesterId: string, yearId: string }) => {
            // Deactivate all
            await supabase.from('semesters').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('academic_years').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');

            // Activate target
            await supabase.from('academic_years').update({ is_active: true }).eq('id', yearId);
            await supabase.from('semesters').update({ is_active: true }).eq('id', semesterId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academic_years'] });
        },
    });

    const deleteYearMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('academic_years').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academic_years'] });
        },
    });

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Tahun Ajaran & Semester</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Tambah Tahun Ajaran</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Input
                            placeholder="Contoh: 2025/2026"
                            value={newYear}
                            onChange={(e) => setNewYear(e.target.value)}
                        />
                        <Button
                            onClick={() => addYearMutation.mutate(newYear)}
                            disabled={!newYear || addYearMutation.isPending}
                        >
                            <Plus className="mr-2 h-4 w-4" /> Tambah
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {isLoading ? (
                    <div>Loading...</div>
                ) : (
                    academicYears?.map((year) => (
                        <Card key={year.id} className={cn(year.is_active ? "border-blue-500 ring-1 ring-blue-500" : "")}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-lg">
                                        {year.tahun_ajaran}
                                        {year.is_active && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Aktif</span>}
                                    </CardTitle>
                                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => {
                                        if (confirm('Hapus tahun ajaran ini?')) deleteYearMutation.mutate(year.id);
                                    }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {year.semesters.map((semester) => (
                                        <div
                                            key={semester.id}
                                            className={cn(
                                                "p-4 rounded-md border flex justify-between items-center cursor-pointer transition-colors",
                                                semester.is_active ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"
                                            )}
                                            onClick={() => activateSemesterMutation.mutate({ semesterId: semester.id, yearId: year.id })}
                                        >
                                            <span className="font-medium">{semester.nama}</span>
                                            {semester.is_active && <Check className="h-4 w-4 text-blue-600" />}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}

