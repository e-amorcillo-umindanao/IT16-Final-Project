interface AppLogoProps {
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
}

const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
};

export default function AppLogo({ size = 'md', showText = true }: AppLogoProps) {
    return (
        <div className="flex items-center gap-2.5">
            {/* Logo mark — mix-blend-mode handles white background on dark surfaces */}
            <div className={`${sizeMap[size]} rounded-lg overflow-hidden flex-shrink-0
                dark:bg-white/5`}>
                <img
                    src="/images/logo.png"
                    alt="SecureVault"
                    className={`${sizeMap[size]} object-contain
                        dark:[mix-blend-mode:lighten]`}
                />
            </div>
            {showText && (
                <span className="font-bold text-foreground tracking-tight
                    text-base leading-none">
                    SecureVault
                </span>
            )}
        </div>
    );
}
