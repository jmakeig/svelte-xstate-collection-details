import 'dotenv/config';
import pg from 'pg';

export class ConstraintViolation extends Error {
	constructor(original) {
		super(original.details);
		this.name = 'ConstraintViolation';
		this.original = original;
	}
}

function wrap_error(error) {
	if ('23505' === error?.code) {
		return new ConstraintViolation(error);
	}
	return error;
}

// Transactions: https://node-postgres.com/features/transactions#a-pooled-client-with-asyncawait
// https://gist.github.com/zerbfra/70b155fa00b4e0d6fd1d4e090a039ad4

function get_database() {
	function create_connection() {
		const config = {
			host: process.env.DB_COCKROACH_HOST,
			port: process.env.DB_COCKROACH_PORT,
			ssl: {
				cert: process.env.DB_COCKROACH_CERT
			},
			user: process.env.DB_COCKROACH_USER,
			password: process.env.DB_COCKROACH_PASSWORD,
			database: process.env.DB_COCKROACH_DATABASE
		};
		return new pg.Pool(config);
	}
	const database = create_connection();

	async function transaction(runner) {
		const client = await database.connect();
		let res;
		try {
			await client.query('BEGIN');
			try {
				res = await runner(client);
				await client.query('COMMIT');
				return res;
			} catch (error) {
				await client.query('ROLLBACK');
				throw wrap_error(error);
			}
		} finally {
			client.release();
		}
	}

	async function query(statement, params = []) {
		try {
			return await database.query(statement, params);
		} catch (error) {
			throw wrap_error(error);
		}
	}

	return {
		_query: query,
		_transaction: transaction,
		async _seed() {
			// Stable keys across invocations
			const uuids = [
				'27e7f459-3127-4c03-b09e-be2a7f849f6e',
				'55f36112-3451-4505-8bde-1a33d99e1fa8',
				'63f04d2c-7b9f-40ac-92ab-1b0fa4f76b6d',
				'9c35962a-9c60-42b7-ad8d-71acffab8159',
				'f0f6818b-5723-43a4-82ec-89105930e9c4',
				'f69c9aab-3b13-4e1d-9a54-e12d45b4aa7a',
				'fd09ea8a-dae1-485e-9fa0-a10e834a36db'
			];
			const sql = 'INSERT INTO items (itemid, name, description, updated) VALUES($1, $2, $3, $4)';

			return await transaction(async (client) => {
				await client.query('DELETE FROM items WHERE TRUE');
				// https://github.com/datalanche/node-pg-format#-arrays-and-objects
				const values = Array.from('abcdefg').map(async (letter, i) => {
					await client.query(sql, [
						uuids[i],
						letter.toUpperCase(),
						`This is ${letter.toUpperCase()}`,
						new Date().toISOString()
					]);
				});
			});
		},
		async get_items() {
			const sql = 'SELECT itemid, name, description, updated FROM items ORDER BY name ASC'; // TODO: Filter
			return query(sql);
		},
		async find_item(id) {
			const sql = 'SELECT itemid, name, description, updated FROM items WHERE itemid = $1';
			const result = await database.query(sql, [id]);
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
