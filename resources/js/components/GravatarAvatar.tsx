import { useState } from 'react';

interface Props {
    name: string;
    avatarUrl: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeMap = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
};

const avatarColors = [
    'bg-amber-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-violet-600',
    'bg-orange-600',
    'bg-teal-600',
];

const getColor = (name: string) =>
    avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last =
        parts.length > 1
            ? parts[parts.length - 1]?.[0] ?? ''
            : parts[0]?.[1] ?? '';
    return `${first}${last}`.toUpperCase();
};

export default function GravatarAvatar({
    name,
    avatarUrl,
    size = 'md',
    className = '',
}: Props) {
    const [failed, setFailed] = useState(false);

    const base = `rounded-full flex items-center justify-center flex-shrink-0 font-semibold overflow-hidden transition-all duration-200 ${sizeMap[size]} ${className}`;

    if (avatarUrl && !failed) {
        return (
            <div className={base}>
                <img
                    src={avatarUrl}
                    alt={`${name}'s profile photo`}
                    className="h-full w-full object-cover"
                    onError={() => setFailed(true)}
                />
            </div>
        );
    }

    return (
        <div className={`${base} ${getColor(name)} text-white shadow-sm`}>
            {getInitials(name)}
        </div>
    );
}
