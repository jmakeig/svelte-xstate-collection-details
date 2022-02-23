import 'dotenv/config';
import { Spanner } from '@google-cloud/spanner';
import { v4 as uuid } from 'uuid';

function get_database() {
	function create_connection() {
		const config = {
			projectId: process.env.DB_SPANNER_PROJECT,
			instanceId: process.env.DB_SPANNER_INSTANCE,
			databaseId: process.env.DB_SPANNER_DATABASE
		};
		return new Spanner({ projectId: config.projectId })
			.instance(config.instanceId)
			.database(config.databaseId);
	}
	const database = create_connection();

	/**
	 * Run within a default transaction. `runner` is a callback that takes the `Transaction`
	 * instance as its only parameter.
	 *
	 * @param {RunTransactionOptions} [options={}]
	 * @param {async function(Transaction)} runner
	 * @returns {*}
	 */
	async function transaction(
		runner,
		options = {
			/* timeout: 1000 */
		}
	) {
		return await database.runTransactionAsync(options, async (txn) => {
			try {
				const results = await runner(txn);
				await txn.commit();
				return results;
			} catch (err) {
				await txn.rollback();
				throw err;
			} finally {
				txn.end();
			}
		});
	}

	/**
	 * Transforms a Spanner result set into something that looks like Postgres (pg).
	 *
	 * @param {Array<Array<name, value>>} results
	 * @returns {Array<Object>}
	 */
	function transform(results) {
		if (!results) return results;
		const rows = results[0];

		let counter = 0;
		function key(n) {
			if ('' === n) return `\$${(++counter).toFixed(0)}`;
			return String(n);
		}
		function value(v) {
			if (null === v) return null;
			return v.valueOf();
		}

		return rows.map((columns) =>
			Object.fromEntries(columns.map((col) => [key(col.name), value(col.value)]))
		);
	}

	async function query(statement, params = []) {
		const results = await database.run({ sql: 'SELECT 1, NULL, "STRING" as tmp' });
		return {
			rows: transform(results)
		};
	}

	return {
		async _seed() {
			const sql =
				'INSERT INTO items (itemid, name, description, updated) VALUES (@itemid, @name, @description, @updated)';
			const statements = Array.from('abcdefg').map((letter) => ({
				sql,
				params: {
					itemid: uuid(),
					name: letter.toUpperCase(),
					description: `This is item ${letter.toUpperCase()}`,
					updated: new Date().toISOString()
				}
			}));

			return await transaction(
				async (txn) => await txn.batchUpdate(['DELETE FROM items WHERE TRUE', ...statements])
			);
		},
		async get_items() {
			const sql = 'SELECT itemid, name, description, updated FROM items ORDER BY name ASC'; // TODO: Filter
			return query(sql);
		},
		async find_item(id) {
			const sql = 'SELECT itemid, name, description, updated FROM items WHERE itemid = $1';
			return database.query(sql, [id]);
		},
		async update_item(item) {
			const sql = 'UPDATE items SET name = $1, description = $2, updated = $3 WHERE itemid = $4';
			const params = [item.name, item.description, new Date().toISOString(), item.id];
			// FIXME: This is a use case for THEN RETURNING
			return transaction((client) => client.query(sql, params)).then(() => this.find_item(item.id));
		}
	};
}

const database = get_database();

database
	._seed()
	.then((results) => {
		console.log('results', [results]);
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => database.end());

// database
// 	.get_items()
// 	.then((results) => {
// 		console.log('results.rows', results.rows);
// 		process.exit(0);
// 	})
// 	.catch((err) => {
// 		console.error(err);
// 		process.exit(1);
// 	})
// 	.finally(() => database.end());

// database
// 	.find_item('3449dfa6-7cea-4ade-98d2-32ede9b17a0b')
// 	.then((results) => {
// 		console.log(results.rows);
// 		process.exit(0);
// 	})
// 	.catch((err) => {
// 		console.error(err);
// 		process.exit(1);
// 	})
// 	.finally(() => database.end());

// database
// 	.update_item({
// 		id: '3449dfa6-7cea-4ade-98d2-32ede9b17a0b',
// 		name: 'NEW Item E',
// 		description: 'I’ve been updated',
// 		updated: 'asdf'
// 	})
// 	.then((results) => {
// 		console.log(results.rows);
// 		process.exit(0);
// 	})
// 	.catch((err) => {
// 		console.error(err);
// 		process.exit(1);
// 	})
// 	.finally(() => database.end());
