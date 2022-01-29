import { text } from 'svelte/internal';
import test from 'tape';

import { createItemsStore } from './_itemsMachine.js';

function fetchItemsTest(filter) {
	return Promise.resolve([
		{ name: 'Un' },
		{ name: 'Deux' },
		{ name: 'Trois' },
		{ name: 'Quatre' },
		{ name: 'Cinq' }
	]);
}

const error = 'Nope!';
function fetchItemsError(filter) {
	return Promise.reject(error);
}

test('itemsMachine initialize', (test) => {
	test.plan(1);
	const store = createItemsStore(fetchItemsTest);
	store.subscribe((items) => {
		if (items.state.matches('initialized')) {
			test.equals(items.length, 5, 'Fetch');
		}
	});
	store.send('initialize');
});

test('itemsMachine initialize error', (test) => {
	test.plan(1);
	const store = createItemsStore(fetchItemsError);
	store.subscribe((items) => {
		if (items.state.matches('uninitialized.error')) {
			test.equals(items.state.context.error, 'Nope!', 'Initialize with fetch');
		}
	});
	store.send('initialize');
});

test.only('itemsMachine initialize select', (test) => {
	test.plan(2);
	const store = createItemsStore(fetchItemsTest);
	store.subscribe((items) => {
		console.log(`«${JSON.stringify(items.state.value, null, 2)}»`);
		if (items.state.matches('initialized.selection.unselected')) {
			test.assert(items.selected === null, 'unselected null');
		}
		if (items.state.matches('initialized.selection.selected')) {
			test.assert(items.selected !== null, 'selected not null');
		}
	});

	store.send('initialize');
	store.send('select', { item: { name: 'Deux' } });
});
