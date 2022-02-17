import { readable } from 'svelte/store';

/**
 * This is a hack to support primitive values in the context selector.
 * It wraps a primitive in its object cousin so that we can add custom
 * properties, like other objects.
 *
 * @param {any} p
 * @returns {object} “boxed” object for primitives
 */
function toObject(p) {
	return new Object(p);
}

/**
 *
 * @param {Actor} service
 * @param {string} key
 * @returns {readable}
 */
export function serviceStore(service, key = 'data', selector = (context, key) => context[key]) {
	// console.log('serviceStore', service, key, selector);
	const store = readable(service.machine.initialState, (set) => {
		service.subscribe((state) => {
			// console.log(`${service.machine.id}#subscribe`);
			// if (false !== state.changed) {
			const o = state.context[key] ? toObject(selector(state.context, key)) : {};
			set(
				Object.defineProperty(o, 'state', {
					get() {
						return state;
					},
					enumerable: false,
					configurable: true
				})
			);
			// }
		});
		service.start();
		return () => service.stop();
	});

	return {
		subscribe: store.subscribe,
		send: log(service.send),
		service
	};
}

function log(f) {
	return function _f(...args) {
		console.log('send', ...args);
		return f(...args);
	};
}

/**
 * Reduces the `meta` properties over all states
 * @param {object} state
 * @param {object} state.meta an object with the XState metadata property
 * @return {object}
 */
export function metadata({ meta }) {
	return Object.keys(meta).reduce((acc, key) => Object.assign(acc, meta[key]), {});
}
