import fs from 'fs';
let c = fs.readFileSync('src/pages/master/TeacherAssignments.tsx', 'utf8');

c = c.replace(
    /\{assignment\.role === 'pembimbing' \? \([\s\S]*?<span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">Pembimbing<\/span>\s*\) : \([\s\S]*?<span className="text-gray-500 text-xs">Guru Mapel<\/span>\s*\)\}/g,
    `{assignment.role === 'pembimbing' ? (
                                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">Pembimbing</span>
                                            ) : assignment.role === 'keduanya' ? (
                                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">Keduanya</span>
                                            ) : (
                                                <span className="text-gray-500 text-xs">Guru Mapel</span>
                                            )}`
);

fs.writeFileSync('src/pages/master/TeacherAssignments.tsx', c);
