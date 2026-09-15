interface UnsavedChangesDialogProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function UnsavedChangesDialog({ open, onConfirm, onCancel }: UnsavedChangesDialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 z-10">
                <h2 className="text-lg font-semibold mb-2">Perubahan Belum Disimpan</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin meninggalkan halaman ini?
                    Semua perubahan akan hilang.
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Tinggalkan Halaman
                    </button>
                </div>
            </div>
        </div>
    );
}
