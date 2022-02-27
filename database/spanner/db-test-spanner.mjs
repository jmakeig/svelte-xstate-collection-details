import { database, ConstraintViolation } from '../../src/lib/db.spanner.js';
import { create_connection } from '../../src/lib/db.spanner.client.js';

// Creates a separate connection to do raw SQL to verify the API
const backdoor = create_connection();

async function seed(conn) {
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

	return await conn.transaction(
		async (txn) => await txn.batchUpdate(['DELETE FROM items WHERE TRUE', ...statements])
	);
}

/*****************************************************************************/
import test from 'tape';

test('Seeding', async (assert) => {
	await seed(backdoor);

	assert.plan(1);
	backdoor.query('SELECT * FROM items').then((result) => assert.equal(result.rows.length, 7));
});

test('Query syntax error', (assert) => {
	assert.plan(1);
	backdoor
		.query('SYNTAX ERROR')
		.then(() => assert.fail('Should throw'))
		.catch((err) => {
			assert.true(err instanceof Error);
		});
});

test('Empty result', (assert) => {
	assert.plan(1);
	backdoor
		.query('SELECT * FROM items WHERE TRUE = FALSE')
		.then((result) => assert.deepEquals(result.rows, []), 'rows object with empty array')
		.catch(() => assert.fail('Shouldn’t throw'));
});

test('get_items', async (assert) => {
	assert.plan(1);
	database
		.get_items()
		.then((items) => assert.equals(items.length, 7, 'get all items'))
		.catch((error) => fail('shouldn’t throw'));
});

test('add_item', async (assert) => {
	await seed(backdoor);
	const item = {
		name: 'New',
		description: 'New'
	};
	assert.plan(6);
	database
		.add_item(item)
		.then((it) => {
			assert.true(item);
			assert.true(it.itemid, `has identifier ${it.itemid}`);
			assert.true(it.updated, `has updated: ${it.updated}`);
			assert.equals(it.name, item.name, `name matches`);
			assert.equals(it.description, item.description, `description matches`);
		})
		.catch((err) => assert.fail(err))
		.then(() => {
			database
				.add_item(item)
				.then(() => assert.fail('Shouldn’t have been able to add again'))
				.catch((error) => {
					// console.error(error);
					assert.true(error instanceof ConstraintViolation, 'is a ConstraintViolation');
				});
		});
});

test('find_item', async (assert) => {
	await seed(backdoor);

	assert.plan(6);
	database
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

	database
		.find_item('aa09ea8a-dae1-485e-9fa0-a10e834a36aa')
		.then((item) => {
			assert.equals(item, undefined, 'not found is undefined');
		})
		.catch((err) => assert.fail(err));

	database
		.find_item(`'; SELECT 1;`)
		.then((item) => {
			assert.fail(err);
		})
		.catch((err) => assert.pass('injection throws'));
});

test.onFinish(async () => {
	await database.close();
	await backdoor.close();
});
