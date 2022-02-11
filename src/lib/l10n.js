/**
 * @param {object | string} message the localized message
 * @param {string} [fallback = ''] if not localized message exists
 * @param {string} [language ] defaults to `window.navigator.language`
 * @return {string}
 * @throws {ReferenceError} avoids coercing `undefined` if no message is found for `language ` and `fallback` is not a `string`
 */
export function message(message, fallback = '', language) {
	if ('string' === typeof message) return message;
	language = language || window?.navigator?.language || 'en';
	if (language in message) return message[language];
	const lang = language.split('-')[0]; // language-region, e.g. en-US
	if (lang in message) return message[lang];
	if ('string' === typeof fallback) return fallback;
	throw new ReferenceError(`No message exists for ${language}`);
}
