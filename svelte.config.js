import adapter from '@sveltejs/adapter-auto';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		vite: {
			server: {
				hmr: {
					// https://github.com/sveltejs/kit/issues/1134
					port: 443
				}
			},
			resolve: {
				alias: {
					// these are the aliases and paths to them
					$components: path.resolve('./src/components')
				}
			}
		}
	}
};

export default config;
