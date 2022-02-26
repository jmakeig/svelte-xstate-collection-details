import 'dotenv/config';
import { Spanner } from '@google-cloud/spanner';
import { v4 as uuid } from 'uuid';

export class ConstraintViolation extends Error {
	constructor(original) {
		super(original.details);
		this.name = 'ConstraintViolation';
		this.original = original;
	}
}

function wrap_error(error) {
	// console.error('wrap_error', error.code, error.message);
	if (6 === error?.code) {
		return new ConstraintViolation(error);
	}
	return error;
}

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
				const result = await runner(txn);
				await txn.commit();
				return result;
			} catch (error) {
				await txn.rollback();
				throw wrap_error(error);
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
		// console.log('Raw results: ', results[0][0].toJSON());
		const [rows, , metadata] = results;

		// console.log(JSON.stringify(metadata, null, 2));

		// Handles the case of multiple unnamed columns, giving them names $1, $2, etc.
		let counter = 0;
		function key(n) {
			if ('' === n) return `\$${(++counter).toFixed(0)}`;
			return String(n);
		}
		function value(v, c) {
			if (null === v) return null;
			if ('TIMESTAMP' === metadata.rowType.fields[c].type.code) {
				// console.log('TIMESTAMP', new Date(v.valueOf()));
				return new Date(v.valueOf());
			}
			return v.valueOf();
		}
		// Note: This doesn’t handle the case of multiple columns with the same name.
		//       Only the last one will show up, just like in the built-in toJSON()
		//       implementation.
		//       🤯 https://github.com/googleapis/nodejs-spanner/blob/8b950b3af8a66be6c27b5482611e116853d23ecf/src/database.ts#L2073
		return rows.map((columns) =>
			Object.fromEntries(columns.map((col, c) => [key(col.name), value(col.value, c)]))
		);
	}

	async function query(statement, params = {}) {
		/* 
		export type RunResponse = [
			Rows,
			spannerClient.spanner.v1.ResultSetStats,  // https://github.com/googleapis/nodejs-spanner/blob/ddf501e0d636a318f54decfab94293b97ba51d4e/protos/google/spanner/v1/result_set.proto#L182
			spannerClient.spanner.v1.ResultSetMetadata // https://github.com/googleapis/nodejs-spanner/blob/ddf501e0d636a318f54decfab94293b97ba51d4e/protos/google/spanner/v1/result_set.proto#L165
		]; 
		*/
		let result;
		try {
			result = await database.run({ sql: statement, params });
		} catch (error) {
			throw wrap_error(error);
		}
		return {
			rows: transform(result)
		};
	}

	return {
		_query: query,
		_transaction: transaction,
		async close() {
			return await database.close();
		},
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
			const sql =
				'INSERT INTO items (itemid, name, description, updated) VALUES (@itemid, @name, @description, @updated)';
			const statements = Array.from('abcdefg').map((letter, i) => ({
				sql,
				params: {
					itemid: uuids[i], //uuid(),
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
		}
	};
}

export const database = get_database();
