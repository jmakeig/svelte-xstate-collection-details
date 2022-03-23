/*
class ValidationError extends Error {}
Object.defineProperty(ValidationError.prototype, 'name', {
	value: 'ValidationError'
});
*/

import { database as db } from '$lib/db';

/** @typedef {import('$lib/db').Item} Item */
/** @typedef {import('$lib/db').Validation} Validation */

export async function get({ params, locals }) {
	const { id } = params;

	if (!id) throw new ReferenceError(`items/id missing`);

	return {
		body: await db.find_item(id)
	};
}

export async function put({ request }) {
	return request
		.json()
		.then(db.update_item)
		.then((/** @type {Item} */ item) => {
			// console.log('put', item);
			return {
				status: 200,
				body: item
			};
		});
}

export async function post({ request }) {
	console.info('post');
	return request
		.json()
		.then(db.validate_item)
		.then((/** @type {Validation[]} */ validation) => {
			return {
				status: 200,
				body: validation
			};
		});
}

/**
 *
 * @param {Item} item
 * @returns {Validation | Validation[] | undefined}
 */
function validate_name_value(item) {
	if ('' === item.name.trim()) return { for: 'name', message: { en: 'Name cannot be empty' } };
}

/**
 *
 * @param {Item} item
 * @returns {Promise<Validation> | Promise<Validation[]> | undefined}
 */
function validate_name_unique(item) {
	return db.validate_item(item);
}

/**
 *
 * @param {Item} item
 * @returns {Promise<Validation[]>}
 */
function validate(item) {
	return validate_name_unique(item);
	// return collect(validate_name_value)([], item).then((v) =>
	// 	collect(validate_name_unique, true)(v, item)
	// );
}

/**
 * Curries a function to allow passing a collector, by default an `Array`, that can
 * “reduce” values over a promise chain. An example is probably more illustrative:
 * @example
 * // Reduces all results from each async invocation into an Array.
 * // A and B are “cheap” and will be evaluated each time. C and D
 * // are “expensive”, such as with a remote database call. They
 * // will only be called if nothing has been collected previously.
 * function validate(item) {
 *  return collect(validate_name)([], item)
 *    .then((v) => collect(validate_name_length)(v, item))
 *    .then((v) => collect(validate_name_unique, true)(v, item))
 *    .then((v) => collect(validate_D, true)(v, item));
 * } // [...A’s results[, ...B’s results[, ...C’s results[, ...D’s results]]]]
 *
 * @template V
 * @param {(...args: any[]) => V | V[] | Promise<V> | Promise<V[]>} f
 * @param {boolean} [is_expensive = false] Whether the invocation should be avoided if nothing has already been collected. The order is thus important: run the cheap validations first.
 * @returns {(collector: V[], ...args: any[]) => Promise<V[]>}
 */
// function collect(f, is_expensive = false) {
// 	return function (collector = [], ...args) {
// 		if (is_expensive && collector.length > 0) return Promise.resolve(collector); // Breaks the chain
// 		return promisify(f(...args)).then((validations) => [...collector, ...arrayify(validations)]);
// 	};
// }

/**
 * @template T
 * @param {T | Promise<T>} value
 * @returns {Promise<T>}
 */
// function promisify(value) {
// 	if (value instanceof Promise) return value;
// 	return Promise.resolve(value);
// }

/**
 * @template T
 * @param {T | Array<T> | undefined} value
 * @returns {Array<T>}
 */
function arrayify(value) {
	if (undefined === value) return [];
	if (Array.isArray(value)) return value;
	return [value];
}
