export const RECAPTCHA_UNAVAILABLE_SENTINEL = '__recaptcha_unavailable__';

export async function getRecaptchaToken(
    siteKey: string,
    action: string,
): Promise<string> {
    try {
        return await new Promise((resolve, reject) => {
            const grecaptcha = window.grecaptcha;

            if (typeof grecaptcha === 'undefined') {
                reject(new Error('reCAPTCHA not loaded'));
                return;
            }

            grecaptcha.ready(() => {
                grecaptcha
                    .execute(siteKey, { action })
                    .then(resolve)
                    .catch(reject);
            });
        });
    } catch {
        return RECAPTCHA_UNAVAILABLE_SENTINEL;
    }
}
