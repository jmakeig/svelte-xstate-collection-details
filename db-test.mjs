import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

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
			return query(sql);
		},
		async find_item(id) {
			const query = {
				sql: 'SELECT itemid, name, description, updated FROM items WHERE itemid = @id', // TODO: Filter
				params: { id }
			};
			return ([rows] = await database.run(query));
		},
		async update_item(item) {
			database.runTransaction(async (err, transaction) => {
				if (err) {
					console.error(err);
					throw err;
				}
				const query = {
					sql: 'UPDATE items SET name = @name, description = @description, updated = @updated WHERE id = @id',
					params: {
						id: item.id,
						name: item.name,
						description: item.description,
						updated: new Date().toISOString()
					}
				};
				try {
					const [rowCount] = await transaction.runUpdate(query);
					await transaction.commit();
				} catch (err) {
					console.error('ERROR:', err);
					throw err;
				}
				// finally {
				// 	database.close();
				// }
			});
		}
	};
}

const database = get_database();
database
	.get_items()
	.then((results) => {
		console.log(results.rows);
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => database.end());
