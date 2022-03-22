/**
 * Returns the first non-`null`, non-`undefined` item in the arguments.
 * Easier to read and write than `obj.prop ? obj.prop : ''`.
 *
 * @param  {...any} args
 * @returns {any}
 */
export function coalesce(...args) {
	let arg;
	for (arg of args) {
		if (null !== arg && undefined !== arg && '' !== arg) return arg;
	}
	return arg;
}
