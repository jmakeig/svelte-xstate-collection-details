<script context="module">
	import { createItemsStore } from './_items';
	export function load({ params, fetch }) {
		const items = createItemsStore(fetch);
		items.send('initialize');
		return {
			props: { items }
		};
	}
</script>

<script>
	/*
	if ('development' === import.meta.env.MODE) {
		console.info(import.meta.env.MODE, 'Enabling XState inspector in a pop-up window');
		import('@xstate/inspect').then(({ inspect }) => {
			if (typeof window !== 'undefined') {
				inspect({
					iframe: false // open in new window
				});
			}
		});
	}
	*/
	import { inspect } from '@xstate/inspect';
	if ('development' === import.meta.env.MODE && typeof window !== 'undefined') {
		console.info(import.meta.env.MODE, 'Enabling XState inspector in a pop-up window');
		inspect({
			iframe: false // open in new window
		});
	}

	export let items;
	import Items from '$components/Items.svelte';
</script>

<!-- <svelte:head>
	<title>Items • {$items.context.items.length}</title>
</svelte:head> -->

<!-- <pre>{JSON.stringify($items.context, null, 2)}</pre> -->
<Items {items} />
