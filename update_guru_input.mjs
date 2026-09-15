import fs from 'fs';

let content = fs.readFileSync('src/pages/raport/GuruInput.tsx', 'utf-8');

// 1. Update type casts
content = content.replace(/useState<'Tahfidz' \| 'Tahsin' \| ''>\(''\)/g, "useState<'Tahfidz' | 'Tahsin' | 'Keduanya' | ''>('')");
content = content.replace(/as 'Tahfidz' \| 'Tahsin'\)/g, "as 'Tahfidz' | 'Tahsin' | 'Keduanya')");

// 2. Insert boolean helpers at the beginning of the component
// Just put it right after activeSemester declaration
content = content.replace(
    /const \[activeSemester, setActiveSemester\] = useState<Semester \| null>\(null\);/g,
    `const [activeSemester, setActiveSemester] = useState<Semester | null>(null);\n\n    const isTahfidz = selectedSubject === 'Tahfidz' || selectedSubject === 'Keduanya';\n    const isTahsin = selectedSubject === 'Tahsin' || selectedSubject === 'Keduanya';`
);

// 3. Replace exact matches with isTahfidz and isTahsin
// In loadAutosave
content = content.replace(/if \(selectedSubject === 'Tahfidz' && data\.tahfidzProgress\)/g, "if (isTahfidz && data.tahfidzProgress)");
content = content.replace(/} else if \(selectedSubject === 'Tahsin'\) {/g, "} \n                if (isTahsin) {");

// In autosave timer
content = content.replace(/selectedSubject === 'Tahfidz' \? 10 : undefined/g, "isTahfidz ? 10 : undefined");
content = content.replace(/selectedSubject === 'Tahfidz' \? tahfidzProgress : undefined/g, "isTahfidz ? tahfidzProgress : undefined");
content = content.replace(/selectedSubject === 'Tahsin' \? tahsin : undefined/g, "isTahsin ? tahsin : undefined");
content = content.replace(/selectedSubject === 'Tahsin' \? uasTulis : undefined/g, "isTahsin ? uasTulis : undefined");
content = content.replace(/selectedSubject === 'Tahsin' \? uasLisan : undefined/g, "isTahsin ? uasLisan : undefined");

// In saveMutation
content = content.replace(/if \(selectedSubject === 'Tahsin'\) {/g, "if (isTahsin) {");
content = content.replace(/} else if \(selectedSubject === 'Tahfidz'\) {/g, "}\n\n            if (isTahfidz) {");
content = content.replace(/if \(selectedSubject === 'Tahfidz' && reportId/g, "if (isTahfidz && reportId");

// In JSX
content = content.replace(/\{selectedSubject === 'Tahfidz' && \(/g, "{isTahfidz && (");
content = content.replace(/\{selectedSubject === 'Tahsin' && \(/g, "{isTahsin && (");

fs.writeFileSync('src/pages/raport/GuruInput.tsx', content, 'utf-8');
console.log('GuruInput.tsx updated successfully');
