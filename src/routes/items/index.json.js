const db = {
	getItems() {
		return new Promise((resolve) => {
			setTimeout(resolve, 40); // Simulate an API delay
		}).then(() =>
			Array.from('abcdef').map((id) => ({
				id, // Only id is needed to select
				name: id.toUpperCase(),
				description: `This is the ${id}.`,
				updated: new Date().toISOString()
			}))
		);
	}
};

export async function get({ params, locals }) {
	const { name } = params;
	//const { article } = await api.get(`articles/${slug}`, locals.user && locals.user.token);

	return {
		body: await db.getItems()
	};
}
