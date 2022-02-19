class ValidationError extends Error {}
Object.defineProperty(ValidationError.prototype, 'name', {
	value: 'ValidationError'
});

const db = {
	find_item(id) {
		return new Promise((resolve) => {
			setTimeout(resolve, 80); // Simulate an API delay
		}).then(() => ({
			id,
			name: String(id).toUpperCase(),
			description: `This is the “${id}”.`,
			updated: new Date().toISOString()
		}));
	},
	update_item(item) {
		console.log('update_item', item);
		return Promise.resolve(Object.assign({}, item, { updated: new Date().toISOString() }));
	}
};

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
