import { v4 as uuid } from 'uuid';
import { ConstraintViolation } from './db-utils.js';

const items = [
	'27e7f459-3127-4c03-b09e-be2a7f849f6e',
	'55f36112-3451-4505-8bde-1a33d99e1fa8',
	'63f04d2c-7b9f-40ac-92ab-1b0fa4f76b6d',
	'9c35962a-9c60-42b7-ad8d-71acffab8159',
	'f0f6818b-5723-43a4-82ec-89105930e9c4',
	'f69c9aab-3b13-4e1d-9a54-e12d45b4aa7a',
	'fd09ea8a-dae1-485e-9fa0-a10e834a36db'
].map((id, i) => ({
	itemid: id,
	name: `Item ${String.fromCharCode(65 + i)}`,
	description: `This is item ${String.fromCharCode(65 + i)}`,
	updated: new Date()
}));

function delay(ms = 0) {
	const wait = ms + 100 * (Math.random() - 0.5);
	return new Promise((resolve) => setTimeout(resolve, wait));
}

const SIMULATED_DELAY = 250; // ms

export const database = {
	get_items() {
		return delay(SIMULATED_DELAY).then(() => items);
	},
	find_item(itemid) {
		return delay(SIMULATED_DELAY).then(() => items.filter((item) => item.itemid === itemid)[0]);
	},
	update_item(item) {
		let result;
		items.forEach((current, i) => {
			if (current.itemid === item.itemid) {
				result = items[i] = Object.assign({}, current, item, { updated: new Date() });
			}
		});
		return Promise.resolve(result);
	},
	add_item(item) {
		// Poor man’s unique constraint on itemid and name
		if (items.some((current) => current.itemid === item.itemid || current.name === item.name))
			return Promise.reject(new ConstraintViolation(`Item already exists`));
		const new_item = Object.assign({}, item, { itemid: uuid(), updated: new Date() });
		items.push(new_item);
		return delay(SIMULATED_DELAY).then(() => new_item);
	},
	close() {
		// no-op
	}
};
