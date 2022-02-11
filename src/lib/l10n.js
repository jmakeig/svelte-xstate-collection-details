/**
 * @param {object | string} message the localized message
 * @param {string} [fallback = ''] if not localized message exists
 * @param {string} [locale] defaults to `window.navigator.language`
 * @return {string}
 * @throws {ReferenceError} avoids coercing `undefined` if no message is found for `locale` and `fallback` is not a `string`
 */
export function message(message, fallback = '', locale) {
	if ('string' === typeof message) return message;
	locale = locale || window?.navigator?.language || 'en';
	if (locale in message) return message[locale];
	const lang = locale.split('-')[0];
	if (lang in message) return message[lang];
	if ('string' === typeof fallback) return fallback;
	throw new ReferenceError(`No message exists for ${locale}`);
}
