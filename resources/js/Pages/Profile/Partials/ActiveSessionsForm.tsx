import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { MonitorSmartphone } from 'lucide-react';

export default function ActiveSessionsForm({
    sessionCount,
    className = '',
}: {
    sessionCount: number;
    className?: string;
}) {
    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">
                    Active Sessions
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                    Manage and log out your active sessions on other browsers and devices.
                </p>
            </header>

            <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                        <MonitorSmartphone className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="font-medium text-gray-900">
                            {sessionCount} Active {sessionCount === 1 ? 'Session' : 'Sessions'}
                        </div>
                        <div className="text-sm text-gray-500">
                            You are currently logged in on {sessionCount} {sessionCount === 1 ? 'device' : 'devices'}.
                        </div>
                    </div>
                </div>

                <Link href={route('sessions.index')}>
                    <Button variant="outline">View Sessions</Button>
                </Link>
            </div>
        </section>
    );
}
