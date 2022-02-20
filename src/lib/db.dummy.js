export const database = {
	get_items() {
		return new Promise((resolve) => {
			setTimeout(resolve, 40); // Simulate an API delay
		}).then(() =>
			Array.from('abcdefg').map((id) => ({
				id, // Only id is needed to select
				name: id.toUpperCase(),
				description: `This is the ${id}.`,
				updated: new Date().toISOString()
			}))
		);
	},
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
