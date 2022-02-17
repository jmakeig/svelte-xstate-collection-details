import { derived } from 'svelte/store';

export function validationStore(store) {
	return derived(store, ($store) => $store.state.context.validation);
}

import { local } from '$lib/l10n';

/**
 *
 * @param {Array} validation `{ for: '', message: ''}`
 * @param {string} name
 * @returns
 */
export function named(validation, name) {
	if (!Array.isArray(validation)) return validation;
	if (!name) return validation;
	return validation.filter((v) => name === v.for);
}

function update_validation(node, validation) {
	const { name } = node;
	// console.log('update_validation', node, validation);
	if (0 === validation.length) {
		node.setCustomValidity('');
		node.setAttribute('aria-invalid', 'false');
		node.removeAttribute('aria-errormessage');
	} else {
		node.setCustomValidity(local(validation[0].message));
		node.setAttribute('aria-invalid', 'true');
		node.setAttribute('aria-errormessage', `${name}-error`);
	}
}

export function valid(node, initial) {
	update_validation(node, initial);
	return {
		update(validation) {
			update_validation(node, validation);
		},
		destroy() {
			node.setCustomValidity('');
		}
	};
}
