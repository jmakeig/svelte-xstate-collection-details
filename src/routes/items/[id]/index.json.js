class ValidationError extends Error {}
Object.defineProperty(ValidationError.prototype, 'name', {
	value: 'ValidationError'
});

import { database as db } from '$lib/db';

export async function get({ params, locals }) {
	const { id } = params;

	if (!id) throw new ReferenceError(`items/id missing`);

	return {
		body: await db.find_item(id)
	};
}

export async function put({ request }) {
	return request
		.json()
		.then(db.update_item)
		.then((item) => {
			console.log('put', item);
			return {
				status: 200,
				body: item
			};
		});
}
