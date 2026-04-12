export const RECAPTCHA_UNAVAILABLE_SENTINEL = '__recaptcha_unavailable__';

let currentToken = '';
let widgetAvailable = false;
let resetWidget: (() => void) | null = null;

export function setRecaptchaAvailable(resetHandler?: (() => void) | null): void {
    widgetAvailable = true;
    resetWidget = resetHandler ?? null;
}

export function setRecaptchaUnavailable(): void {
    widgetAvailable = false;
    currentToken = '';
    resetWidget = null;
}

export function onRecaptchaSuccess(token: string): void {
    currentToken = token;
}

export function onRecaptchaExpired(): void {
    currentToken = '';
}

export function getRecaptchaToken(): string {
    if (! widgetAvailable) {
        return RECAPTCHA_UNAVAILABLE_SENTINEL;
    }

    return currentToken;
}

export function resetRecaptchaToken(): void {
    currentToken = '';
    resetWidget?.();
}
