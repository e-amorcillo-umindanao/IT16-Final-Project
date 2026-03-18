import { Shield } from 'lucide-react';
import { HTMLAttributes } from 'react';

export default function ApplicationLogo({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div {...props} className={`flex items-center gap-3 ${className}`}>
            <div className="flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20 p-2">
                <Shield className="h-full w-full text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">
                SecureVault
            </span>
        </div>
    );
}

