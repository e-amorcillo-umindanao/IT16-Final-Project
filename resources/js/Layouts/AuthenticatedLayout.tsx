import AppLogo from '@/components/AppLogo';
import GlobalSearch from '@/components/GlobalSearch';
import ThemeToggle from '@/components/ThemeToggle';
import VaultLock from '@/components/VaultLock';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState, useEffect } from 'react';
import { useFlashToasts } from '@/hooks/useFlashToasts';
import { 
    LayoutDashboard, 
    FileText, 
    Users as UsersIcon, 
    Activity, 
    Trash2, 
    ShieldCheck, 
    UserCog, 
    ScrollText, 
    Monitor, 
    Menu, 
    X, 
    LogOut, 
    User as UserIcon,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import GravatarAvatar from '@/components/GravatarAvatar';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    useFlashToasts();
    
    const { auth } = usePage().props as any;
    const user = auth.user;
    const permissions = auth.permissions || [];
    const canViewAdminDashboard = permissions.includes('view_admin_dashboard');
    const canManageUsers = permissions.includes('manage_users');
    const canViewAllDocuments = permissions.includes('view_all_documents');
    const canViewAuditLogs = permissions.includes('view_audit_logs');
    const canManageSessions = permissions.includes('manage_sessions');
    const showAdminSection =
        canViewAdminDashboard ||
        canManageUsers ||
        canViewAllDocuments ||
        canViewAuditLogs ||
        canManageSessions;

    const getRoleLabel = () => {
        const rawRole = typeof user.role === 'string' ? user.role : null;

        if (rawRole === 'super-admin') {
            return 'Super Admin';
        }

        if (rawRole === 'admin') {
            return 'Admin';
        }

        if (rawRole === 'user') {
            return 'User';
        }

        if (
            canViewAdminDashboard ||
            canManageUsers ||
            canViewAllDocuments ||
            canViewAuditLogs ||
            canManageSessions
        ) {
            return 'Admin';
        }

        return 'User';
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Close mobile menu on route change (simulated by checking route in usePage)
    const { url } = usePage();
    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
    }, [url]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsSearchOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const NavItem = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) => (
        <Link
            href={href}
            className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active 
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-background" : "text-muted-foreground group-hover:text-foreground")} />
            {(isSidebarOpen || isMobileMenuOpen) && <span>{label}</span>}
        </Link>
    );

    const NavGroup = ({ title, children }: { title: string; children: ReactNode }) => (
        <div className="space-y-1 mb-6">
            {(isSidebarOpen || isMobileMenuOpen) && (
                <h3 className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.32em] text-primary">
                    {title}
                </h3>
            )}
            <div className="flex flex-col gap-1">
                {children}
            </div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside 
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card text-foreground transition-all duration-300 ease-in-out lg:static lg:z-auto",
                    isSidebarOpen ? "w-64" : "w-20",
                    isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Logo Area */}
                <div className="flex h-16 items-center border-b border-border px-4">
                    <Link href="/" className="flex items-center gap-3 overflow-hidden">
                        <AppLogo size="md" showText={isSidebarOpen || isMobileMenuOpen} />
                    </Link>
                </div>

                {/* Navigation Scroll Area */}
                <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <NavGroup title="Main">
                        <NavItem 
                            href={route('dashboard')} 
                            icon={LayoutDashboard} 
                            label="Dashboard" 
                            active={route().current('dashboard')} 
                        />
                        <NavItem 
                            href={route('documents.index')} 
                            icon={FileText} 
                            label="My Vault" 
                            active={route().current('documents.index')} 
                        />
                        <NavItem 
                            href={route('shared.index')} 
                            icon={UsersIcon} 
                            label="Shared with Me" 
                            active={route().current('shared.index')} 
                        />
                    </NavGroup>

                    <NavGroup title="System">
                        <NavItem 
                            href={route('activity.index')} 
                            icon={Activity} 
                            label="Activity" 
                            active={route().current('activity.index')} 
                        />
                        <NavItem 
                            href={route('documents.trash')} 
                            icon={Trash2} 
                            label="Trash" 
                            active={route().current('documents.trash')} 
                        />
                    </NavGroup>

                    {showAdminSection && (
                        <NavGroup title="Admin">
                            {canViewAdminDashboard && (
                                <NavItem 
                                    href={route('admin.dashboard')} 
                                    icon={ShieldCheck} 
                                    label="Admin Dashboard" 
                                    active={route().current('admin.dashboard')} 
                                />
                            )}
                            {canManageUsers && (
                                <NavItem 
                                    href={route('admin.users')} 
                                    icon={UserCog} 
                                    label="Users" 
                                    active={route().current('admin.users')} 
                                />
                            )}
                            {canViewAllDocuments && (
                                <NavItem
                                    href={route('admin.documents')}
                                    icon={FileText}
                                    label="All Documents"
                                    active={route().current('admin.documents')}
                                />
                            )}
                            {canViewAuditLogs && (
                                <NavItem 
                                    href={route('admin.audit-logs')} 
                                    icon={ScrollText} 
                                    label="Global Logs" 
                                    active={route().current('admin.audit-logs')} 
                                />
                            )}
                            {canManageSessions && (
                                <NavItem 
                                    href={route('admin.sessions')} 
                                    icon={Monitor} 
                                    label="Sessions" 
                                    active={route().current('admin.sessions')} 
                                />
                            )}
                        </NavGroup>
                    )}
                </nav>

                {/* Sidebar Footer - User Profile */}
                <div className="border-t border-border bg-card/40 p-4">
                    <div className={cn("flex items-center gap-3 mb-4", !isSidebarOpen && !isMobileMenuOpen && "justify-center")}>
                        <GravatarAvatar 
                            name={user.name} 
                            avatarUrl={user.avatar_url} 
                            size={isSidebarOpen || isMobileMenuOpen ? "md" : "sm"} 
                        />
                        {(isSidebarOpen || isMobileMenuOpen) && (
                            <div className="flex flex-col min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                                <p className="truncate text-xs font-medium uppercase tracking-[0.14em] text-primary">
                                    {getRoleLabel()}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <Link href={route('profile.edit')}>
                            <Button variant="ghost" className="h-9 w-full justify-start px-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                                <UserIcon className="h-4 w-4 mr-2" />
                                {(isSidebarOpen || isMobileMenuOpen) && "Profile Settings"}
                            </Button>
                        </Link>
                        <Link href={route('logout')} method="post" as="button" className="w-full">
                            <Button variant="ghost" className="h-9 w-full justify-start px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                                <LogOut className="h-4 w-4 mr-2" />
                                {(isSidebarOpen || isMobileMenuOpen) && "Log Out"}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Desktop Collapse Toggle */}
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute -right-3 bottom-20 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-primary lg:flex"
                >
                    {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Top Header */}
                <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 lg:hidden">
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="-ml-2 p-2 text-muted-foreground hover:text-primary"
                    >
                        <Menu size={24} />
                    </button>
                    <AppLogo size="sm" showText={true} />
                    <ThemeToggle />
                </header>

                {/* Content Header (Optional, breadcrumbs or title) */}
                {header && (
                    <header className="border-b border-border bg-background py-6">
                        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 sm:px-6 lg:px-8">
                            {header}
                            <div className="hidden shrink-0 items-center gap-3 lg:flex">
                                <div className="w-[20rem]">
                                    <GlobalSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
                                </div>
                                <ThemeToggle />
                            </div>
                        </div>
                    </header>
                )}
                {!header && (
                    <div className="hidden items-center justify-end gap-3 border-b border-border bg-background px-4 py-3 lg:flex">
                        <div className="w-[20rem]">
                            <GlobalSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
                        </div>
                        <ThemeToggle />
                    </div>
                )}

                {/* Main Page Content */}
                <main className="custom-scrollbar flex-1 overflow-y-auto bg-background">
                    {children}
                </main>
            </div>

            <VaultLock userEmail={user.email} />
        </div>
    );
}
