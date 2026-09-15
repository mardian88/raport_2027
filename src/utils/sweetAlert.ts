import Swal from 'sweetalert2';

export const showAlert = {
    success: (title: string, text?: string) => {
        return Swal.fire({
            title,
            text,
            icon: 'success',
            confirmButtonColor: '#3b82f6' // tailwind blue-500
        });
    },
    error: (title: string, text?: string) => {
        return Swal.fire({
            title,
            text,
            icon: 'error',
            confirmButtonColor: '#3b82f6'
        });
    },
    warning: (title: string, text?: string) => {
        return Swal.fire({
            title,
            text,
            icon: 'warning',
            confirmButtonColor: '#3b82f6'
        });
    },
    confirm: async (title: string, text?: string) => {
        const result = await Swal.fire({
            title,
            text,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444', // red-500
            cancelButtonColor: '#6b7280', // gray-500
            confirmButtonText: 'Ya, Lanjutkan',
            cancelButtonText: 'Batal'
        });
        return result.isConfirmed;
    }
};
