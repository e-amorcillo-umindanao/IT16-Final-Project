import { UAParser } from 'ua-parser-js';

export interface DeviceInfo {
    browser: string;
    os: string;
    label: string;
    isMobile: boolean;
}

export function parseUserAgent(ua: string | null): DeviceInfo {
    if (!ua) {
        return {
            browser: 'Unknown device',
            os: 'User agent unavailable',
            label: 'Unknown device',
            isMobile: false,
        };
    }

    const parser = new UAParser(ua);
    const browser = parser.getBrowser();
    const osInfo = parser.getOS();
    const device = parser.getDevice();

    const rawBrowser = [browser.name, browser.major].filter(Boolean).join(' ') || 'Unknown browser';
    const rawOs = [osInfo.name, osInfo.version].filter(Boolean).join(' ') || 'Unknown OS';
    const isUnknownDevice = rawBrowser === 'Unknown browser' && rawOs === 'Unknown OS';

    const browserLabel = isUnknownDevice ? 'Unknown device' : rawBrowser;
    const label = isUnknownDevice ? 'Unknown device' : `${rawBrowser} on ${rawOs}`;

    return {
        browser: browserLabel,
        os: rawOs,
        label,
        isMobile: device.type === 'mobile' || device.type === 'tablet',
    };
}
