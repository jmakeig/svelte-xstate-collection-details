import 'dotenv/config';
import pg from 'pg';

// Transactions: https://node-postgres.com/features/transactions#a-pooled-client-with-asyncawait
// https://gist.github.com/zerbfra/70b155fa00b4e0d6fd1d4e090a039ad4

function get_database(config) {
	const database = new pg.Pool(config);

	async function transaction(runner) {
		const client = await database.connect();
		let res;
		try {
			await client.query('BEGIN');
			try {
				res = await runner(client);
				await client.query('COMMIT');
				return res;
			} catch (err) {
				await client.query('ROLLBACK');
				throw err;
			}
		} finally {
			client.release();
		}
	}

	async function query(statement, params = []) {
		return database.query(statement, params);
		//return transaction((client) => client.query(statement, params));
	}

	return {
		async get_items() {
			const sql = 'SELECT itemid, name, description, updated FROM items ORDER BY name ASC'; // TODO: Filter
			return query(sql).then((response) => response.rows);
		},
		async find_item(id) {
			const sql = 'SELECT itemid, name, description, updated FROM items WHERE itemid = $1';
			return database.query(sql, [id]).then((response) => rows[0]);
		},
		async update_item(item) {
			const sql = 'UPDATE items SET name = $1, description = $2, updated = $3 WHERE itemid = $4';
			const params = [item.name, item.description, new Date().toISOString(), item.id];
			// FIXME: This is a use case for THEN RETURNING
			return transaction((client) => client.query(sql, params))
				.then(() => this.find_item(item.id))
				.then((response) => rows[0]);
		}
	};
}

export const database = get_database({
	host: process.env.DB_COCKROACH_HOST,
	port: process.env.DB_COCKROACH_PORT,
	ssl: {
		cert: process.env.DB_COCKROACH_CERT
	},
	user: process.env.DB_COCKROACH_USER,
	password: process.env.DB_COCKROACH_PASSWORD,
	database: process.env.DB_COCKROACH_DATABASE
});
