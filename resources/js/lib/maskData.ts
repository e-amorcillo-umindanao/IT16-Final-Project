export function maskEmail(email: string): string {
    const atIndex = email.indexOf('@');

    if (atIndex < 0) {
        return '***';
    }

    const local = email.slice(0, atIndex);
    const domain = email.slice(atIndex);
    const length = local.length;

    let masked: string;

    if (length <= 2) {
        masked = '*'.repeat(length);
    } else if (length <= 4) {
        masked = local[0] + '*'.repeat(length - 1);
    } else {
        masked = local.slice(0, 2) + '*'.repeat(length - 3) + local[length - 1];
    }

    return masked + domain;
}

export function maskIp(ip: string): string {
    const parts = ip.split('.');

    if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }

    const colonIndex = ip.lastIndexOf(':');

    if (colonIndex > -1) {
        return ip.slice(0, colonIndex + 1) + 'xxxx';
    }

    return 'xxx.xxx.xxx.xxx';
}
