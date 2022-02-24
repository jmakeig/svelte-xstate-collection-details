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

	async function query(statement, params = {}) {
		// const results = await database.run({ sql: 'SELECT 1, NULL, "STRING" as tmp' });
		const results = await database.run({ sql: statement, params });
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
			const sql = 'SELECT itemid, name, description, updated FROM items WHERE itemid = @itemid';
			return query(sql, { itemid: id });
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
		}
	};
}

const database = get_database();

/*
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
*/

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
// 	.find_item('d8d36609-2124-4148-ba87-2bbf5db626b2')
// 	.then((results) => {
// 		console.log('results', results.rows);
// 		process.exit(0);
// 	})
// 	.catch((err) => {
// 		console.error(err);
// 		process.exit(1);
// 	})
// 	.finally(() => database.end());

// database
// 	.update_item({
// 		itemid: '3c13e867-694c-4dd0-96fd-fa65446e2834', // A
// 		name: 'THIS IS TOTALLY NEW',
// 		description: 'I’ve been updated',
// 		updated: undefined
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

database
	.add_item({
		itemid: undefined,
		name: 'H',
		description: 'This is H',
		updated: undefined
	})
	.then((item) => {
		console.log(item);
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => database.end());
