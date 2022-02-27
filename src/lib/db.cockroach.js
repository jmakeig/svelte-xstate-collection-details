import { create_connection } from './db.cockroach.client.js';
export { ConstraintViolation } from './db.cockroach.client.js';

// Transactions: https://node-postgres.com/features/transactions#a-pooled-client-with-asyncawait
// https://gist.github.com/zerbfra/70b155fa00b4e0d6fd1d4e090a039ad4

function get_database() {
	// With RETURNING we don’t even need transactions
	const { database, query, transaction } = create_connection();
	return {
		async get_items() {
			const sql = 'SELECT itemid, name, description, updated FROM items ORDER BY name ASC'; // TODO: Filter
			return (await query(sql)).rows;
		},
		async find_item(id) {
			const sql = 'SELECT itemid, name, description, updated FROM items WHERE itemid = $1';
			const result = await query(sql, [id]);
			return result.rows[0];
		},
		async update_item(item) {
			const sql = `
			  UPDATE items 
				SET 
				  name = $1, 
					description = $2, 
					updated = CURRENT_TIMESTAMP()
			  WHERE 
				  itemid = $3
				RETURNING
				  itemid, name, description, updated`;
			const params = [item.name, item.description, item.id];
			const result = await query(sql, params);
			return result.rows[0];
		},
		async add_item(item) {
			const sql = `
			  INSERT INTO 
				  items (itemid, name, description, updated) 
				VALUES (gen_random_uuid(), $1, $2, $3) 
				RETURNING 
				  itemid, name, description, updated`;
			const result = await query(sql, [item.name, item.description, new Date().toISOString()]);
			return result.rows[0];
		},
		async close() {
			return await database.end();
		}
	};
}

export const database = get_database();
