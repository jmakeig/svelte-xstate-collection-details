import { derived } from 'svelte/store';

export function validationStore(store) {
	return derived(store, ($store) => $store.state.context.validation);
}

export function named(validation, name) {
	if (!Array.isArray(validation)) return validation;
	if (!name) return validation;
	return validation.filter((v) => name === v.for);
}

export function valid(node, initial) {
	const { name } = node;
	return {
		update(validation) {
			if (0 === validation.length) {
				node.setCustomValidity('');
				node.setAttribute('aria-invalid', 'false');
				node.removeAttribute('aria-errormessage');
			} else {
				node.setCustomValidity(validation[0].message);
				node.setAttribute('aria-invalid', 'false');
				node.setAttribute('aria-errormessage', `${name}-error`);
			}
		},
		destroy() {
			// the node has been removed from the DOM
		}
	};
}
