import 'dotenv/config';
import pg from 'pg';
import { ConstraintViolation } from './db-utils.js';

function wrap_error(error) {
	if ('23505' === error?.code) {
		return new ConstraintViolation(error);
	}
	return error;
}

export function create_connection() {
	function connect() {
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
	const database = connect();
	return {
		database,
		async close() {
			return await database.end();
		},
		async transaction(runner) {
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
		},
		async query(statement, params = []) {
			try {
				return await database.query(statement, params);
			} catch (error) {
				throw wrap_error(error);
			}
		}
	};
}
