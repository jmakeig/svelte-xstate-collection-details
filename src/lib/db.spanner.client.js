import 'dotenv/config';
import { Spanner } from '@google-cloud/spanner';

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

export function create_connection() {
	function connect() {
		const config = {
			projectId: process.env.DB_SPANNER_PROJECT,
			instanceId: process.env.DB_SPANNER_INSTANCE,
			databaseId: process.env.DB_SPANNER_DATABASE
		};
		return new Spanner({ projectId: config.projectId })
			.instance(config.instanceId)
			.database(config.databaseId);
	}

	const database = connect();

	return {
		database,
		/**
		 * Run within a default transaction. `runner` is a callback that takes the `Transaction`
		 * instance as its only parameter.
		 *
		 * @param {RunTransactionOptions} [options={}]
		 * @param {async function(Transaction)} runner
		 * @returns {*}
		 */
		async transaction(
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
		},
		async query(statement, params = {}) {
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
		},
		async close() {
			return await database.close();
		}
	};
}
