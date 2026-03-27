import { useMemo } from 'react';

interface TimeBasedGreetingProps {
    firstName: string;
    className?: string;
}

export function TimeBasedGreeting({ firstName, className }: TimeBasedGreetingProps) {
    const { greeting, emoji } = useMemo(() => {
        const hour = new Date().getHours();

        if (hour < 12) return { greeting: 'Good morning', emoji: '☀️' };
        if (hour < 18) return { greeting: 'Good afternoon', emoji: '🌤️' };

        return { greeting: 'Good evening', emoji: '🌙' };
    }, []);

    return (
        <p className={`text-sm text-muted-foreground ${className ?? ''}`}>
            {greeting}, {firstName}! {emoji}
        </p>
    );
}
