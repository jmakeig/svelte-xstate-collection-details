import { readable } from 'svelte/store';

function isPrimitive(obj) {
	switch (typeof obj) {
		case 'string':
		case 'number':
		case 'boolean':
			return true;
		case 'object':
			if (null === obj) return true;
	}
	return false;
}
function isIterable(obj) {
	if (!obj) return false;
	return 'function' === typeof obj[Symbol.iterator];
}

function getProperties(obj) {
	if (isIterable(obj)) {
		// console.log(
		// 	'getProperties',
		// 	obj,
		// 	Array.from({
		// 		//length: obj.length,
		// 		[Symbol.iterator]: obj[Symbol.iterator]
		// 	})
		// );
		return {
			//[Symbol.iterator]: obj[Symbol.iterator] // Why doesn’t this work?
			*[Symbol.iterator]() {
				for (const item of obj) yield item;
			}
		};
	}
	if (isPrimitive(obj)) {
		return { value: obj }; // Hack!
	}
	// Is this really the intention?
	// What about, Date, Map, Set, etc.
	return obj;
}
/**
 *
 * @param {Actor} service
 * @param {string} key
 * @returns {readable}
 */
export function serviceStore(
	service,
	key = 'data',
	selector = (context, key) => getProperties(context[key])
) {
	console.log('serviceStore', service, key, selector);
	const store = readable(service.machine.initialState, (set) => {
		service.subscribe((state) => {
			console.log(`${service.machine.id}#subscribe`);
			//if (false !== state.changed) {
			set({
				// Spread the context such that you can do $toggle.lastUpdate rather than
				// $toggle.context.lastUpdate. This is more about aesthetics and keystrokes
				// than functionality or performance.
				...selector(state.context, key),
				// Access the state via a property and push context to the top level
				state
			});
			//}
		});
		service.start();
		return () => service.stop();
	});

	return {
		subscribe: store.subscribe,
		send: service.send,
		service
	};
}
