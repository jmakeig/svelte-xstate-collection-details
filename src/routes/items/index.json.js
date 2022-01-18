const db = {
	getItems() {
		return new Promise((resolve) => {
			setTimeout(resolve, 40); // Simulate an API delay
		}).then(() => [{ name: 'A' }, { name: 'B' }, { name: 'C' }]);
	}
};

export async function get({ params, locals }) {
	const { name } = params;
	//const { article } = await api.get(`articles/${slug}`, locals.user && locals.user.token);

	return {
		body: await db.getItems()
	};
}
