import { readable } from 'svelte/store';

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
			const o = state.context[key] ? selector(state.context, key) : {};
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
