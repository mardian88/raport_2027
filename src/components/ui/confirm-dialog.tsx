import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./dialog"
import { Button } from "./button"

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
    isLoading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    onCancel,
    confirmLabel = "Konfirmasi",
    cancelLabel = "Batal",
    variant = 'default',
    isLoading = false
}: ConfirmDialogProps) {
    const handleConfirm = () => {
        onConfirm();
        // Don't close automatically if loading, let parent handle it
        if (!isLoading) {
            onOpenChange(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Memproses...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
