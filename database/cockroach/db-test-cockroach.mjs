import { database, ConstraintViolation } from '../../src/lib/db.cockroach.js';

/* database
	._seed()
	.then((results) => {
		console.log(results);
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
	.find_item('3449dfa6-7cea-4ade-98d2-32ede9b17a0b')
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
	.update_item({
		id: '3449dfa6-7cea-4ade-98d2-32ede9b17a0b',
		name: 'NEW Item E',
		description: 'I’ve been updated',
		updated: 'asdf'
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
					// console.error(JSON.stringify(error, null, 2));
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

test.onFinish(() => database.close());
