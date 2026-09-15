import { localDb } from './src/lib/localDb.ts';
const { data, error } = await localDb.from('academic_years').insert([{ tahun_ajaran: '2025/2026', is_active: false }]).select().single();
console.log('DATA:', data);
console.log('ERROR:', error);
