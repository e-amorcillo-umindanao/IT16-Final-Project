import GlobalSearch from '@/components/GlobalSearch';
import ThemeToggle from '@/components/ThemeToggle';
import UserAvatar from '@/components/UserAvatar';
import VaultLock from '@/components/VaultLock';
import { useFlashToasts } from '@/hooks/useFlashToasts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    ChevronLeft,
    ChevronRight,
    FileText,
    LayoutDashboard,
    LogOut,
    Menu,
    Monitor,
    Settings2,
    Shield,
    ShieldCheck,
    Trash2,
    User as UserIcon,
    UserCog,
    Users as UsersIcon,
    X,
} from 'lucide-react';
import { PropsWithChildren, ReactNode, useEffect, useMemo, useState } from 'react';

const SIDEBAR_STORAGE_KEY = 'securevault.sidebar.open';
type SidebarEntry = {
    href?: string;
    label: string;
    icon: typeof LayoutDashboard;
    active: boolean;
    onClick?: () => void;
};

type SidebarSection = {
    label: string;
    items: SidebarEntry[];
};

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    useFlashToasts();

    const page = usePage();
    const { auth } = page.props as any;
    const user = auth.user;
    const permissions = auth.permissions || [];
    const roles = auth.roles || [];
    const { url } = page;

    const canViewAdminDashboard = permissions.includes('view_admin_dashboard');
    const canManageUsers = permissions.includes('manage_users');
    const canViewAllDocuments = permissions.includes('view_all_documents');
    const canViewAuditLogs = permissions.includes('view_audit_logs');
    const canManageSessions = permissions.includes('manage_sessions');
    const canManageIpRules = permissions.includes('manage_ip_rules');

    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const isDesktopExpanded = isSidebarExpanded && !isMobileMenuOpen;
    const showSidebarText = isMobileMenuOpen || isDesktopExpanded;
    const normalizedUrl = url.split('?')[0] || '/';
    const isDocumentArea =
        normalizedUrl === '/documents' || normalizedUrl.startsWith('/documents/');
    const isTrashArea = normalizedUrl === '/trash' || normalizedUrl.startsWith('/trash');

    const roleLabel = roles.includes('super-admin')
        ? 'Super Admin'
        : roles.includes('admin')
          ? 'Admin'
          : 'User';

    const routeLabelMap = useMemo(
        () =>
            new Map<string, string>([
                ['dashboard', 'Dashboard'],
                ['documents.index', 'My Vault'],
                ['documents.create', 'Upload Document'],
                ['documents.trash', 'Trash'],
                ['shared.index', 'Shared with Me'],
                ['activity.index', 'Activity'],
                ['profile.edit', 'Profile Settings'],
                ['sessions.index', 'My Sessions'],
                ['admin.dashboard', 'Admin Dashboard'],
                ['admin.users', 'Users'],
                ['admin.documents', 'All Documents'],
                ['admin.audit-logs', 'Global Logs'],
                ['admin.audit-integrity', 'Integrity Check'],
                ['admin.ip-rules.index', 'IP Rules'],
                ['admin.sessions', 'Sessions'],
            ]),
        [],
    );

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [url]);

    useEffect(() => {
        const storedSidebarState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

        if (storedSidebarState === 'true' || storedSidebarState === 'false') {
            setIsSidebarExpanded(storedSidebarState === 'true');
        }

    }, []);

    useEffect(() => {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarExpanded));
    }, [isSidebarExpanded]);

    const mainItems: SidebarEntry[] = [
        {
            href: route('dashboard'),
            label: 'Dashboard',
            icon: LayoutDashboard,
            active: route().current('dashboard'),
        },
        {
            href: route('documents.index'),
            label: 'My Vault',
            icon: FileText,
            active: isDocumentArea && !isTrashArea,
        },
        {
            href: route('shared.index'),
            label: 'Shared with Me',
            icon: UsersIcon,
            active: route().current('shared.index'),
        },
        {
            href: route('activity.index'),
            label: 'Activity',
            icon: Activity,
            active: route().current('activity.index'),
        },
        {
            href: route('documents.trash'),
            label: 'Trash',
            icon: Trash2,
            active: isTrashArea,
        },
    ];

    const adminItems: SidebarEntry[] = [
        ...(canViewAdminDashboard
            ? [
                  {
                      href: route('admin.dashboard'),
                      label: 'Admin Dashboard',
                      icon: ShieldCheck,
                      active: route().current('admin.dashboard'),
                  },
              ]
            : []),
        ...(canManageUsers
            ? [
                  {
                      href: route('admin.users'),
                      label: 'Users',
                      icon: UserCog,
                      active: route().current('admin.users'),
                  },
              ]
            : []),
        ...(canViewAllDocuments
            ? [
                  {
                      href: route('admin.documents'),
                      label: 'All Documents',
                      icon: FileText,
                      active: route().current('admin.documents'),
                  },
              ]
            : []),
        ...(canViewAuditLogs
            ? [
                  {
                      href: route('admin.audit-logs'),
                      label: 'Global Logs',
                      icon: Shield,
                      active: route().current('admin.audit-logs'),
                  },
                  {
                      href: route('admin.audit-integrity'),
                      label: 'Integrity Check',
                      icon: ShieldCheck,
                      active: route().current('admin.audit-integrity'),
                  },
              ]
            : []),
        ...(canManageIpRules
            ? [
                  {
                      href: route('admin.ip-rules.index'),
                      label: 'IP Rules',
                      icon: Settings2,
                      active: route().current('admin.ip-rules.*'),
                  },
              ]
            : []),
        ...(canManageSessions
            ? [
                  {
                      href: route('admin.sessions'),
                      label: 'Sessions',
                      icon: Monitor,
                      active: route().current('admin.sessions'),
                  },
              ]
            : []),
    ];

    const accountItems: SidebarEntry[] = [
        {
            href: route('sessions.index'),
            label: 'My Sessions',
            icon: Monitor,
            active: route().current('sessions.index'),
        },
    ];

    const sidebarSections: SidebarSection[] = [
        { label: 'Main', items: mainItems },
        ...(adminItems.length > 0 ? [{ label: 'Admin', items: adminItems }] : []),
        { label: 'Account', items: accountItems },
    ];

    const toggleSidebar = () => {
        setIsSidebarExpanded((current) => !current);
    };

    const SidebarRow = ({
        href,
        label,
        icon: Icon,
        active,
    }: SidebarEntry) => {
        const content = (
            <div
                className={cn(
                    'group flex w-full items-center rounded-2xl px-3 py-2.5 text-sm transition-all',
                    showSidebarText ? 'justify-start gap-3' : 'justify-center px-0',
                    active
                        ? 'border border-amber-200 bg-amber-50 text-stone-950 shadow-sm'
                        : 'border border-transparent text-stone-600 hover:border-stone-200 hover:bg-white/85 hover:text-stone-950',
                )}
            >
                <Icon
                    className={cn(
                        'h-5 w-5 shrink-0',
                        active ? 'text-amber-700' : 'text-stone-500 group-hover:text-stone-900',
                    )}
                />
                {showSidebarText && <span className="truncate font-medium">{label}</span>}
            </div>
        );

        const link = href ? <Link href={href}>{content}</Link> : content;

        if (showSidebarText) {
            return link;
        }

        return (
            <Tooltip delayDuration={120}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">
                    <p>{label}</p>
                </TooltipContent>
            </Tooltip>
        );
    };

    const SectionLabel = ({ children }: { children: ReactNode }) =>
        showSidebarText ? (
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-400">
                {children}
            </p>
        ) : null;

    return (
        <TooltipProvider>
            <div className="flex min-h-screen bg-[#fbfaf6] text-foreground">
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] lg:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                <aside
                    className={cn(
                        'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-stone-200/80 bg-[#f8f4ec] text-stone-900 transition-all duration-300 ease-out lg:static lg:z-auto',
                        isSidebarExpanded ? 'w-[280px]' : 'w-[88px]',
                        isMobileMenuOpen
                            ? 'translate-x-0 w-[280px] shadow-2xl'
                            : '-translate-x-full lg:translate-x-0',
                    )}
                >
                    <div
                        className={cn(
                            'flex h-16 items-center border-b border-stone-200/80',
                            showSidebarText ? 'justify-between px-4' : 'justify-center gap-2 px-3',
                        )}
                    >
                        {showSidebarText && (
                            <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-sm">
                                    <img
                                        src="/images/logo.png"
                                        alt="SecureVault"
                                        className="h-5 w-5 object-contain"
                                    />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-stone-950">
                                        SecureVault
                                    </p>
                                    <p className="truncate text-xs text-stone-500">
                                        Secure workspace
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={toggleSidebar}
                                className="hidden rounded-xl text-stone-500 hover:bg-white hover:text-stone-950 lg:inline-flex"
                                aria-label={
                                    isSidebarExpanded
                                        ? 'Collapse sidebar'
                                        : 'Expand sidebar'
                                }
                            >
                                {isSidebarExpanded ? (
                                    <ChevronLeft className="h-5 w-5" />
                                ) : (
                                    <ChevronRight className="h-5 w-5" />
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="rounded-xl text-stone-500 hover:bg-white hover:text-stone-950 lg:hidden"
                                aria-label="Close sidebar"
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-4">
                        <nav className="space-y-6">
                            {sidebarSections.map((section) => (
                                <div key={section.label} className="space-y-2">
                                    <SectionLabel>{section.label}</SectionLabel>
                                    <div className="space-y-1">
                                        {section.items.map((item) => (
                                            <SidebarRow key={item.label} {...item} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </nav>

                    </div>

                    <div className="border-t border-stone-200/80 px-3 py-4">
                        <div
                            className={cn(
                                'rounded-2xl border border-stone-200/80 bg-white/95 p-3 shadow-sm',
                                !showSidebarText && 'px-2.5 py-3',
                            )}
                        >
                            <div
                                className={cn(
                                    'flex items-center gap-3',
                                    !showSidebarText && 'justify-center',
                                )}
                            >
                                <UserAvatar
                                    user={user}
                                    avatarUrl={user.avatar_url}
                                    size={showSidebarText ? 'md' : 'sm'}
                                />
                                {showSidebarText && (
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-stone-950">
                                            {user.name}
                                        </p>
                                        <p className="truncate text-xs text-stone-500">
                                            {roleLabel}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 space-y-1">
                                <SidebarRow
                                    href={route('profile.edit')}
                                    label="Profile"
                                    icon={UserIcon}
                                    active={route().current('profile.edit')}
                                />
                                <Tooltip delayDuration={120}>
                                    <TooltipTrigger asChild>
                                        <Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                            className="w-full text-left"
                                        >
                                            <div
                                                className={cn(
                                                    'group flex w-full items-center rounded-2xl px-3 py-2.5 text-sm text-stone-600 transition-all hover:bg-stone-50 hover:text-stone-950',
                                                    showSidebarText
                                                        ? 'justify-start gap-3'
                                                        : 'justify-center px-0',
                                                )}
                                            >
                                                <LogOut className="h-5 w-5 shrink-0 text-stone-500 group-hover:text-stone-900" />
                                                {showSidebarText && (
                                                    <span className="truncate font-medium">
                                                        Log Out
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    </TooltipTrigger>
                                    {!showSidebarText && (
                                        <TooltipContent side="right">
                                            <p>Log Out</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="flex h-16 items-center justify-between border-b border-stone-200/80 bg-white px-4 lg:hidden">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="-ml-2"
                            aria-label="Open sidebar"
                        >
                            <Menu className="h-6 w-6" />
                        </Button>
                        <span className="text-base font-semibold text-foreground">
                            SecureVault
                        </span>
                        <ThemeToggle />
                    </header>

                    {header && (
                        <header className="border-b border-stone-200/80 bg-white py-5">
                            <div className="mx-auto flex max-w-7xl items-start justify-between gap-5 px-4 sm:px-6 lg:px-8">
                                {header}
                                <div className="hidden shrink-0 items-center gap-3 lg:flex">
                                    <div className="w-[24rem]">
                                        <GlobalSearch auth={auth} />
                                    </div>
                                    <ThemeToggle />
                                </div>
                            </div>
                        </header>
                    )}

                    {!header && (
                        <div className="hidden items-center justify-end gap-3 border-b border-stone-200/80 bg-white px-4 py-3 lg:flex">
                            <div className="w-[24rem]">
                                <GlobalSearch auth={auth} />
                            </div>
                            <ThemeToggle />
                        </div>
                    )}

                    <main className="custom-scrollbar flex-1 overflow-y-auto bg-[#fbfaf6]">
                        {children}
                    </main>
                </div>

                <VaultLock userEmail={user.email} />
            </div>
        </TooltipProvider>
    );
}
