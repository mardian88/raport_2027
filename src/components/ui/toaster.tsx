import { useEffect, useState } from "react"
import { useToast } from "./use-toast"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

function ToastItem({ toast, dismiss }: { toast: any, dismiss: (id: string) => void }) {
    const { id, title, description, action, variant, duration = 3000, ...props } = toast;
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        let startTime = Date.now();
        let animationFrame: number;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            if (remaining > 0) {
                animationFrame = requestAnimationFrame(animate);
            } else {
                dismiss(id);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrame);
        };
    }, [id, duration, dismiss]);

    return (
        <div
            key={id}
            className={`
                group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full
                ${variant === 'destructive' ? 'border-red-200 bg-red-50 text-red-900' :
                    variant === 'success' ? 'border-green-200 bg-green-50 text-green-900' :
                        'border-gray-200 bg-white text-gray-950'}
            `}
            {...props}
        >
            <div className="flex gap-3 items-start relative z-10">
                {variant === 'success' && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                {variant === 'destructive' && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                {!variant && <Info className="h-5 w-5 text-blue-600 mt-0.5" />}

                <div className="grid gap-1">
                    {title && <div className="text-sm font-semibold">{title}</div>}
                    {description && (
                        <div className="text-sm opacity-90">{description}</div>
                    )}
                </div>
            </div>
            {action}
            <button
                onClick={() => dismiss(id)}
                className={`absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 relative z-10 ${variant === 'destructive' ? 'text-red-900 hover:text-red-900 focus:ring-red-900' : 'text-gray-950 hover:text-gray-950 focus:ring-gray-950'
                    }`}
            >
                <X className="h-4 w-4" />
            </button>
            
            {/* Progress Bar */}
            <div 
                className={`absolute bottom-0 left-0 h-1 transition-all ease-linear ${
                    variant === 'destructive' ? 'bg-red-500' :
                    variant === 'success' ? 'bg-green-500' :
                    'bg-gray-500'
                }`}
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}

export function Toaster() {
    const { toasts, dismiss } = useToast()

    return (
        <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2">
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} dismiss={dismiss} />
            ))}
        </div>
    )
}
