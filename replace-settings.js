const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/settings/Settings.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content
    .replace("alert('Pengaturan berhasil disimpan')", "showAlert.success('Berhasil', 'Pengaturan berhasil disimpan')")
    .replace("alert('Gagal menyimpan: ' + error.message)", "showAlert.error('Gagal', 'Gagal menyimpan: ' + error.message)")
    .replace("alert('Predikat dan nilai minimum harus diisi')", "showAlert.warning('Peringatan', 'Predikat dan nilai minimum harus diisi')")
    .replace("alert('Nilai minimum harus antara 0-100')", "showAlert.warning('Peringatan', 'Nilai minimum harus antara 0-100')")
    .replace("alert('Predikat sudah ada')", "showAlert.warning('Peringatan', 'Predikat sudah ada')")
    .replace("alert('Nilai minimum harus antara 0-100')", "showAlert.warning('Peringatan', 'Nilai minimum harus antara 0-100')");

// Tambah import jika belum ada
if (!content.includes("import { showAlert }")) {
    content = content.replace(
        "import { CloudinaryUpload } from '../../components/ui/CloudinaryUpload';",
        "import { CloudinaryUpload } from '../../components/ui/CloudinaryUpload';\nimport { showAlert } from '../../utils/sweetAlert';"
    );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Settings.tsx updated');
