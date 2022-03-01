import { database as cockroach_api } from '../src/lib/db.cockroach.js';
import { create_connection as cockroach_connect } from '../src/lib/db.cockroach.client.js';
import { database as spanner_api } from '../src/lib/db.spanner.js';
import { create_connection as spanner_connect } from '../src/lib/db.spanner.client.js';
import { ConstraintViolation } from '../src/lib/db-utils.js';

import test from 'tape';

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

async function spanner_seed(conn) {
	const sql =
		'INSERT INTO items (itemid, name, description, updated) VALUES (@itemid, @name, @description, @updated)';
	const statements = uuids.map((id, i) => ({
		sql,
		params: {
			itemid: id,
			name: `Item ${String.fromCharCode(65 + i)}`,
			description: `This is item ${String.fromCharCode(65 + i)}`,
			updated: new Date().toISOString()
		}
	}));
	return await conn.transaction(
		async (txn) => await txn.batchUpdate(['DELETE FROM items WHERE TRUE', ...statements])
	);
}

async function cockroach_seed(conn) {
	const sql = 'INSERT INTO items (itemid, name, description, updated) VALUES($1, $2, $3, $4)';
	return await conn.transaction(async (client) => {
		await client.query('DELETE FROM items WHERE TRUE');
		// https://github.com/datalanche/node-pg-format#-arrays-and-objects
		uuids.forEach(async (id, i) => {
			await client.query(sql, [
				id,
				`Item ${String.fromCharCode(65 + i)}`,
				`This is item ${String.fromCharCode(65 + i)}`,
				new Date().toISOString()
			]);
		});
	});
}

scaffold_tests(cockroach_api, cockroach_connect(), { seed: cockroach_seed }, 'Cockroach');
scaffold_tests(spanner_api, spanner_connect(), { seed: spanner_seed }, 'Spanner');

function scaffold_tests(api, backdoor, { seed }, name = '') {
	test(`${name + ': '}Seeding`, async (assert) => {
		await seed(backdoor);

		assert.plan(1);
		backdoor
			.query('SELECT * FROM items')
			.then((result) =>
				assert.equal(result.rows.length, 7, 'seeding returned correct number of rows')
			);
	});

	test(`${name + ': '}Query syntax error`, (assert) => {
		assert.plan(1);
		backdoor
			.query('SYNTAX ERROR')
			.then(() => assert.fail('Should throw'))
			.catch((err) => {
				assert.true(err instanceof Error);
			});
	});

	test(`${name + ': '}Empty result`, (assert) => {
		assert.plan(1);
		backdoor
			.query('SELECT * FROM items WHERE TRUE = FALSE')
			.then((result) => assert.deepEquals(result.rows, []), 'rows object with empty array')
			.catch(() => assert.fail('Shouldn’t throw'));
	});

	test(`${name + ': '}get_items`, async (assert) => {
		assert.plan(1);
		api
			.get_items()
			.then((items) => assert.equals(items.length, 7, 'get all items'))
			.catch((error) => fail('shouldn’t throw'));
	});

	test(`${name + ': '}add_item`, async (assert) => {
		await seed(backdoor);
		const item = {
			name: 'New',
			description: 'New'
		};
		assert.plan(6);
		api
			.add_item(item)
			.then((it) => {
				assert.true(item, 'item is not empty');
				assert.true(it.itemid, `has identifier ${it.itemid}`);
				assert.true(it.updated, `has updated: ${it.updated}`);
				assert.equals(it.name, item.name, `name matches`);
				assert.equals(it.description, item.description, `description matches`);
			})
			.catch((err) => assert.fail(err))
			.then(() => {
				api
					.add_item(item)
					.then(() => assert.fail('Shouldn’t have been able to add again'))
					.catch((error) => {
						// console.error(error);
						assert.true(error instanceof ConstraintViolation, 'is a ConstraintViolation');
					});
			});
	});

	test(`${name + ': '}find_item`, async (assert) => {
		await seed(backdoor);

		assert.plan(6);
		api
			.find_item('f69c9aab-3b13-4e1d-9a54-e12d45b4aa7a')
			.then((item) => {
				assert.equals(item.itemid, 'f69c9aab-3b13-4e1d-9a54-e12d45b4aa7a', 'itemid');
				assert.true(item.name, 'name');
				assert.true(item.description, 'description');
				assert.true(
					item.updated instanceof Date,
					`updated is Date: ${item.updated} (freshly seeded)`
				);
			})
			.catch((err) => assert.fail(err));

		api
			.find_item('aa09ea8a-dae1-485e-9fa0-a10e834a36aa')
			.then((item) => {
				assert.equals(item, undefined, 'not found returns undefined');
			})
			.catch((err) => assert.fail(err));

		api
			.find_item(`'; SELECT 1;`)
			.then((item) => {
				assert.fail(err);
			})
			.catch((err) => assert.pass('injection attempt throws'));
	});

	test(`${name + ': '}update_item`, async (assert) => {
		await seed(backdoor);

		assert.plan(3);
		api
			.update_item({
				itemid: uuids[3],
				name: 'DUH!',
				description: 'TOTALLY NEW',
				updated: 'This should be ignored completely'
			})
			.then((item) => {
				assert.equals(item.itemid, uuids[3], 'matching primary key');
				assert.equals(item.name, 'DUH!', 'updated name');
				assert.equals(item.description, 'TOTALLY NEW', 'updated description');
			})
			.catch((error) => assert.fail(error.message));
	});

	test.onFinish(async () => {
		await api.close();
		await backdoor.close();
	});
}
