import fs from 'fs';
let c = fs.readFileSync('src/pages/raport/RaportInput.tsx', 'utf8');
c = c.replace(/key=\{subject\} value=\{subject\}>\s*\{subject\}/, "key={subject} value={subject}>{subject === 'Keduanya' ? 'Keduanya (Tahfidz & Tahsin)' : subject}");
fs.writeFileSync('src/pages/raport/RaportInput.tsx', c);
