export type Item = {
	itemid: string;
	name: string;
	description: string;
	updated: Date;
};

export type ItemsAPI = {
	get_items: () => Promise<Item[]>;
	find_item: (itemid: string) => Promise<Item | undefined>;
	update_item: (item: Item) => Promise<Item>;
	add_item: (item: Item) => Promise<Item>;
	close: () => void;
};
