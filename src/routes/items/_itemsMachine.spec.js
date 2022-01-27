import { text } from 'svelte/internal';
import test from 'tape';

import { createItemsStore } from './_itemsMachine.js';

test('itemsMachine initialize', (test) => {
	function fetchItemsTest(filter) {
		return Promise.resolve([
			{ name: 'Un' },
			{ name: 'Deux' },
			{ name: 'Trois' },
			{ name: 'Quatre' },
			{ name: 'Cinq' }
		]);
	}

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
	const msg = 'Nope!';
	function fetchItemsTest(filter) {
		return Promise.reject(msg);
	}

	test.plan(1);
	const store = createItemsStore(fetchItemsTest);
	store.subscribe((items) => {
		if (items.state.matches('uninitialized.error')) {
			test.equals(items.state.context.error, 'Nope!', 'Initialize with fetch');
		}
	});
	store.send('initialize');
});
