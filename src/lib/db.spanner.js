import { create_connection } from './db.spanner.client.js';
export { ConstraintViolation } from './db.spanner.client.js';
import { v4 as uuid } from 'uuid';

function get_database() {
	const { database, query, transaction } = create_connection();

	return {
		async get_items() {
			const sql = 'SELECT itemid, name, description, updated FROM items ORDER BY name ASC'; // TODO: Filter
			return query(sql);
		},
		async find_item(id) {
			const sql = 'SELECT itemid, name, description, updated FROM items WHERE itemid = @itemid';
			const result = await query(sql, { itemid: id });
			return result.rows[0];
		},
		async update_item(item) {
			const sql =
				'UPDATE items SET name = @name, description = @description, updated = @updated WHERE itemid = @itemid';
			const params = { ...item, updated: new Date().toISOString() };
			return await transaction(async (txn) => await txn.runUpdate({ sql, params })).then(() =>
				this.find_item(item.itemid)
			);
		},
		async add_item(item) {
			const sql =
				'INSERT INTO items (itemid, name, description, updated) VALUES (@itemid, @name, @description, @updated)';
			const params = { ...item, itemid: uuid(), updated: new Date().toISOString() };
			return await transaction(async (txn) => await txn.runUpdate({ sql, params })).then(
				([count]) => {
					// const [a, b] = [10, 20]; a === 10, b === 20
					//const [count] = results;
					// UGLY!
					if (count === 1) return params;
					else throw new Error(count);
				}
			);
		},
		async close() {
			return await database.close();
		}
	};
}

export const database = get_database();
