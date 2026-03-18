import ApplicationLogo from '@/components/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState, useEffect } from 'react';
import { Toaster } from 'sonner';
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
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    useFlashToasts();
    
    const { auth } = usePage().props as any;
    const user = auth.user;
    const roles = auth.roles || [];
    const isAdmin = roles.some((r: string) => ['super-admin', 'admin'].includes(r));

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu on route change (simulated by checking route in usePage)
    const { url } = usePage();
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [url]);

    const NavItem = ({ href, icon: Icon, label, active }: { href: string; icon: any; label: string; active: boolean }) => (
        <Link
            href={href}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-sm font-medium",
                active 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
        >
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "group-hover:text-indigo-400")} />
            {(isSidebarOpen || isMobileMenuOpen) && <span>{label}</span>}
        </Link>
    );

    const NavGroup = ({ title, children }: { title: string; children: ReactNode }) => (
        <div className="space-y-1 mb-6">
            {(isSidebarOpen || isMobileMenuOpen) && (
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                    {title}
                </h3>
            )}
            <div className="flex flex-col gap-1">
                {children}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-zinc-50 flex">
            
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
                    "fixed inset-y-0 left-0 z-50 flex flex-col bg-zinc-950 text-white transition-all duration-300 ease-in-out lg:static lg:z-auto",
                    isSidebarOpen ? "w-64" : "w-20",
                    isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {/* Logo Area */}
                <div className="h-16 flex items-center px-4 border-b border-white/5">
                    <Link href="/" className="flex items-center gap-3 overflow-hidden">
                        <ApplicationLogo className={cn("h-8 w-auto shrink-0 transition-all", !isSidebarOpen && !isMobileMenuOpen && "scale-110")} />
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

                    {isAdmin && (
                        <NavGroup title="Admin">
                            <NavItem 
                                href={route('admin.dashboard')} 
                                icon={ShieldCheck} 
                                label="Admin Dashboard" 
                                active={route().current('admin.dashboard')} 
                            />
                            <NavItem 
                                href={route('admin.users')} 
                                icon={UserCog} 
                                label="Users" 
                                active={route().current('admin.users')} 
                            />
                            <NavItem 
                                href={route('admin.audit-logs')} 
                                icon={ScrollText} 
                                label="Global Logs" 
                                active={route().current('admin.audit-logs')} 
                            />
                            <NavItem 
                                href={route('admin.sessions')} 
                                icon={Monitor} 
                                label="Sessions" 
                                active={route().current('admin.sessions')} 
                            />
                        </NavGroup>
                    )}
                </nav>

                {/* Sidebar Footer - User Profile */}
                <div className="p-4 border-t border-white/5 bg-zinc-900/30">
                    <div className={cn("flex items-center gap-3 mb-4", !isSidebarOpen && !isMobileMenuOpen && "justify-center")}>
                        <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {user.name.charAt(0)}
                        </div>
                        {(isSidebarOpen || isMobileMenuOpen) && (
                            <div className="flex flex-col min-w-0">
                                <p className="text-sm font-semibold truncate">{user.name}</p>
                                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <Link href={route('profile.edit')}>
                            <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white px-2 h-9">
                                <UserIcon className="h-4 w-4 mr-2" />
                                {(isSidebarOpen || isMobileMenuOpen) && "Profile Settings"}
                            </Button>
                        </Link>
                        <Link href={route('logout')} method="post" as="button" className="w-full">
                            <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 h-9">
                                <LogOut className="h-4 w-4 mr-2" />
                                {(isSidebarOpen || isMobileMenuOpen) && "Log Out"}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Desktop Collapse Toggle */}
                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="hidden lg:flex absolute bottom-20 -right-3 h-6 w-6 items-center justify-center rounded-full bg-white border border-zinc-200 text-zinc-600 shadow-sm hover:text-indigo-600 transition-colors"
                >
                    {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Top Header */}
                <header className="h-16 flex items-center justify-between px-4 bg-white border-b border-zinc-200 lg:hidden">
                    <button 
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 text-zinc-600 hover:text-indigo-600"
                    >
                        <Menu size={24} />
                    </button>
                    <ApplicationLogo className="h-7 w-auto" />
                    <div className="w-8" /> {/* Placeholder for balance */}
                </header>

                {/* Content Header (Optional, breadcrumbs or title) */}
                {header && (
                    <header className="bg-white border-b border-zinc-200 py-6">
                        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                            {header}
                        </div>
                    </header>
                )}

                {/* Main Page Content */}
                <main className="flex-1 overflow-y-auto bg-zinc-50 custom-scrollbar">
                    {children}
                </main>
            </div>
            
            <Toaster richColors position="top-right" />
        </div>
    );
}

