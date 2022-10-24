
// @migration task: Check imports
import { database as db } from '$lib/db';
import { json } from '@sveltejs/kit';

export async function GET({ params, locals }) {
	// const { name } = params;
	return json(await db.get_items());
	
}
