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
			if (state.context[key]) {
				//console.log('Object.assign()', Object.assign(state.context[key], { state }).state);
				set(Object.assign(selector(state.context, key), { state }));
			} else {
				set({ state });
			}
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
