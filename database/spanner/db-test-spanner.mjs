import { database, ConstraintViolation } from '../../src/lib/db.spanner.js';

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

/*
database
	.get_items()
	.then((results) => {
		console.log('results.rows', results.rows);
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => database.end());
*/

/*
database
	.find_item('d8d36609-2124-4148-ba87-2bbf5db626b2')
	.then((results) => {
		console.log('results', results.rows);
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => database.end());
*/

/*
database
	.update_item({
		itemid: '3c13e867-694c-4dd0-96fd-fa65446e2834', // A
		name: 'THIS IS TOTALLY NEW',
		description: 'I’ve been updated',
		updated: undefined
	})
	.then((results) => {
		console.log(results.rows);
		process.exit(0);
	})
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => database.end());
*/

/*
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
*/

import test from 'tape';

test('Seeding', async (assert) => {
	await database._seed();

	assert.plan(1);
	database._query('SELECT * FROM items').then((result) => assert.equal(result.rows.length, 7));
});

test('Query syntax error', (assert) => {
	assert.plan(1);
	database
		._query('SYNTAX ERROR')
		.then(() => assert.fail('Should throw'))
		.catch((err) => {
			assert.true(err instanceof Error);
		});
});

test('Empty result', (assert) => {
	assert.plan(1);
	database
		._query('SELECT * FROM items WHERE TRUE = FALSE')
		.then((result) => assert.deepEquals(result.rows, []), 'rows object with empty array')
		.catch(() => assert.fail('Shouldn’t throw'));
});

test('add_item', async (assert) => {
	await database._seed();
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
	await database._seed();

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

test.onFinish(async () => await database.close());
