import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buildGravatarUrl } from '@/lib/gravatar';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

type AvatarUser = {
    name: string;
    email?: string | null;
    avatar_url?: string | null;
    google_avatar?: string | null;
};

interface Props {
    user: AvatarUser;
    avatarUrl?: string | null;
    size?: AvatarSize;
    className?: string;
    fallbackClassName?: string;
}

const sizeMap: Record<AvatarSize, string> = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-11 w-11 text-base',
    xl: 'h-16 w-16 text-lg',
    '2xl': 'h-20 w-20 text-xl',
};

const avatarColors = [
    'bg-amber-600',
    'bg-blue-600',
    'bg-emerald-600',
    'bg-violet-600',
    'bg-orange-600',
    'bg-teal-600',
];

function getAvatarColor(name: string) {
    return avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];
}

function getInitials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last =
        parts.length > 1
            ? parts[parts.length - 1]?.[0] ?? ''
            : parts[0]?.[1] ?? '';

    return `${first}${last}`.toUpperCase();
}

export default function UserAvatar({
    user,
    avatarUrl,
    size = 'md',
    className,
    fallbackClassName,
}: Props) {
    const name = user.name.trim() || 'User';
    const customAvatarUrl = avatarUrl ?? user.avatar_url ?? null;
    const googleAvatarUrl = user.google_avatar ?? null;
    const gravatarUrl = useMemo(
        () => (user.email ? buildGravatarUrl(user.email, 80) : null),
        [user.email],
    );
    const imageSources = [customAvatarUrl, googleAvatarUrl, gravatarUrl].filter(
        (value): value is string => Boolean(value),
    );
    const [imageIndex, setImageIndex] = useState(0);
    const resolvedImageUrl = imageSources[imageIndex] ?? null;

    useEffect(() => {
        setImageIndex(0);
    }, [customAvatarUrl, googleAvatarUrl, gravatarUrl]);

    const handleImageError = () => {
        if (imageIndex < imageSources.length - 1) {
            setImageIndex((current) => current + 1);
            return;
        }
    };

    return (
        <Avatar className={cn(sizeMap[size], className)}>
            {resolvedImageUrl && (
                <AvatarImage
                    src={resolvedImageUrl}
                    alt={`${name}'s profile photo`}
                    className="object-cover"
                    onError={handleImageError}
                />
            )}
            <AvatarFallback
                className={cn(
                    'font-semibold text-white',
                    getAvatarColor(name),
                    fallbackClassName,
                )}
            >
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}
