import { useState, useRef } from 'react';
import { Button } from './button';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from './use-toast';

interface CloudinaryUploadProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    placeholder?: string;
    accept?: string;
}

export function CloudinaryUpload({
    value,
    onChange,
    label = "Upload Gambar",
    placeholder = "Pilih file gambar",
    accept = "image/*"
}: CloudinaryUploadProps) {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY || "788299416675769";
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET || "1YzmUcP2QKvO_-_Z6CSMCaW9nWA";
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "jx1p1p2b";

    const generateSignature = async (timestamp: number, secret: string) => {
        const str = `timestamp=${timestamp}${secret}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);

        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const signature = await generateSignature(timestamp, apiSecret);

            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || 'Gagal mengupload gambar');
            }

            const data = await response.json();
            onChange(data.secure_url);

            toast({
                title: "Upload Berhasil",
                description: "Gambar berhasil diunggah.",
            });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                title: "Gagal",
                description: error.message || "Terjadi kesalahan saat mengunggah gambar.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = () => {
        onChange('');
    };

    return (
        <div className="space-y-2">
            <div className="flex items-start gap-4">
                <input
                    type="file"
                    accept={accept}
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleUpload}
                    disabled={isUploading}
                />
                
                {value ? (
                    <div className="relative border rounded-md p-2 w-32 h-32 flex items-center justify-center bg-gray-50 group">
                        <img 
                            src={value} 
                            alt="Uploaded preview" 
                            className="max-w-full max-h-full object-contain"
                        />
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="border border-dashed rounded-md p-2 w-32 h-32 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span className="text-xs text-center">Belum ada</span>
                    </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-32"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                {value ? 'Ubah' : label}
                            </>
                        )}
                    </Button>
                    <p className="text-xs text-gray-500 max-w-[200px]">
                        Pilih {placeholder}.
                    </p>
                </div>
            </div>
        </div>
    );
}
