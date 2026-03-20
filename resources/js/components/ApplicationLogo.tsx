import { Shield } from 'lucide-react';
import { HTMLAttributes } from 'react';

export default function ApplicationLogo({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div {...props} className={`flex items-center gap-3 ${className}`}>
            <div className="flex shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <Shield className="h-full w-full text-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-current">
                SecureVault
            </span>
        </div>
    );
}
