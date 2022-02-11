const db = {
	getItem(id) {
		return new Promise((resolve) => {
			setTimeout(resolve, 80); // Simulate an API delay
		}).then(() => ({
			id,
			name: String(id).toUpperCase(),
			description: `This is the “${id}”.`,
			updated: new Date().toISOString()
		}));
	}
};

export async function get({ params, locals }) {
	const { id } = params;

	if (!id) throw new ReferenceError(`items/id missing`);

	return {
		body: await db.getItem(id)
	};
}
