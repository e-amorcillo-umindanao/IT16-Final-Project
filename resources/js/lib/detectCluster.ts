import { differenceInSeconds, parseISO } from 'date-fns';

export interface AuditEntry {
    action: string;
    created_at: string;
    ip_address: string | null;
}

export interface ClusterResult {
    detected: boolean;
    count: number;
    windowSeconds: number;
    ip: string | null;
}

export function detectCluster(
    entries: AuditEntry[],
    failureActions: Set<string>,
    windowSeconds: number,
    threshold: number,
): ClusterResult {
    const failures = entries.filter((entry) => failureActions.has(entry.action));

    for (let index = 0; index < failures.length; index += 1) {
        const anchor = parseISO(failures[index].created_at);
        const cluster = failures.filter((entry) => (
            Math.abs(differenceInSeconds(parseISO(entry.created_at), anchor)) <= windowSeconds
        ));

        if (cluster.length >= threshold) {
            return {
                detected: true,
                count: cluster.length,
                windowSeconds,
                ip: cluster[0]?.ip_address ?? null,
            };
        }
    }

    return {
        detected: false,
        count: 0,
        windowSeconds,
        ip: null,
    };
}
