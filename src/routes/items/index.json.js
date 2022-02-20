import { database as db } from '$lib/db';

export async function get({ params, locals }) {
	// const { name } = params;

	return {
		body: await db.get_items()
	};
}
