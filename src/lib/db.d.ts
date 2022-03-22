export type Item = {
	itemid: string;
	name: string;
	description: string;
	updated: Date;
};

// https://www.npmjs.com/package/locale-enum
declare enum Locale {
	en = 'en',
	fr = 'fr'
}

// https://docs.microsoft.com/en-us/javascript/api/@azure/keyvault-certificates/requireatleastone?view=azure-node-latest
type RequireAtLeastOne<T> = {
	[K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

declare type Validation = {
	for: string;
	message: string | RequireAtLeastOne<{ [key in Locale]: string }>;
};
export type ItemsAPI = {
	get_items: () => Promise<Pick<Item, 'itemid' | 'name'>[]>;
	find_item: (itemid: string) => Promise<Item | undefined>;
	update_item: (item: Item) => Promise<Item>;
	add_item: (item: Item) => Promise<Item>;
	validate_item: (item: Item) => Promise<Validation[]>;
	close: () => void;
};
