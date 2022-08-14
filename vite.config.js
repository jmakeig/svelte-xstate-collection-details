import path from 'path';
import { sveltekit } from '@sveltejs/kit/vite';
const config = {
	plugins: [sveltekit()],
	resolve: {
		alias: {
			// these are the aliases and paths to them
			$components: path.resolve('./src/components')
		}
	}
};
export default config;
