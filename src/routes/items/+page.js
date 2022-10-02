import { createItemsStore } from './_items';
export function load({ params, fetch }) {
	const items = createItemsStore(fetch);
	items.send('initialize');
	return { items };
}
