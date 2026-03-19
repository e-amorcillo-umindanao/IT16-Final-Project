import { Shield } from 'lucide-react';
import { HTMLAttributes } from 'react';

export default function ApplicationLogo({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div {...props} className={`flex items-center gap-3 ${className}`}>
            <div className="flex shrink-0 items-center justify-center rounded-xl border border-[rgba(212,168,67,0.18)] bg-[linear-gradient(180deg,rgba(212,168,67,0.18),rgba(212,168,67,0.06))] p-2 text-primary">
                <Shield className="h-full w-full text-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-current">
                SecureVault
            </span>
        </div>
    );
}
