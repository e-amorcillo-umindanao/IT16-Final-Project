export interface CidrInfo {
    valid: boolean;
    first?: string;
    last?: string;
    count?: number;
    error?: string;
}

/**
 * Checks whether an IPv4 address falls within a CIDR range.
 * Returns false for any parse failure. IPv6 is not evaluated client-side.
 */
export function cidrContainsIp(cidr: string, ip: string): boolean {
    try {
        const parsed = parseCidr(cidr);
        const ipNum = ipToNum(ip);

        if (!parsed.valid || ipNum === null || parsed.first === undefined || parsed.last === undefined) {
            return false;
        }

        const firstNum = ipToNum(parsed.first);
        const lastNum = ipToNum(parsed.last);

        if (firstNum === null || lastNum === null) {
            return false;
        }

        return ipNum >= firstNum && ipNum <= lastNum;
    } catch {
        return false;
    }
}

export function parseCidr(cidr: string): CidrInfo {
    if (!cidr.trim()) {
        return { valid: false };
    }

    try {
        const [range, bitsStr] = cidr.trim().split('/');

        if (!range || bitsStr === undefined) {
            return { valid: false, error: 'Missing prefix length (e.g. /24)' };
        }

        const bits = Number.parseInt(bitsStr, 10);

        if (Number.isNaN(bits) || bits < 0 || bits > 32) {
            return { valid: false, error: 'Prefix must be between 0 and 32' };
        }

        const rangeNum = ipToNum(range);

        if (rangeNum === null) {
            return { valid: false, error: 'Invalid IP address' };
        }

        const mask = bits === 0 ? 0 : (~(2 ** (32 - bits) - 1)) >>> 0;
        const first = (rangeNum & mask) >>> 0;
        const last = (first | (~mask >>> 0)) >>> 0;
        const count = 2 ** (32 - bits);

        return {
            valid: true,
            first: numToIp(first),
            last: numToIp(last),
            count,
        };
    } catch {
        return { valid: false, error: 'Invalid CIDR notation' };
    }
}

function ipToNum(ip: string): number | null {
    const parts = ip.split('.').map((segment) => Number(segment));

    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
        return null;
    }

    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function numToIp(num: number): string {
    return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255,
    ].join('.');
}
