import UserAvatar from '@/components/UserAvatar';

interface Props {
    name: string;
    email?: string | null;
    avatarUrl: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    className?: string;
}

export default function GravatarAvatar({
    name,
    email = null,
    avatarUrl,
    size = 'md',
    className = '',
}: Props) {
    return (
        <UserAvatar
            user={{
                name,
                email,
                avatar_url: avatarUrl,
            }}
            avatarUrl={avatarUrl}
            size={size}
            className={className}
        />
    );
}
