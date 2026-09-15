import fs from 'fs';
let c = fs.readFileSync('src/lib/turso-client.ts', 'utf8');
c = c.replace(/let colVal = f\.value;\s+if \(typeof colVal === 'boolean'\) colVal = colVal \? 1 : 0;/g, "let colVal = f.value;\n                if (colVal === undefined) colVal = null;\n                if (typeof colVal === 'boolean') colVal = colVal ? 1 : 0;");
fs.writeFileSync('src/lib/turso-client.ts', c);
