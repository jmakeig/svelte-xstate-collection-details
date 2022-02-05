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
	export let items;
	import Items from '$components/Items.svelte';
</script>

<!-- <svelte:head>
	<title>Items • {$items.context.items.length}</title>
</svelte:head> -->

<!-- <pre>{JSON.stringify($items.context, null, 2)}</pre> -->
<Items {items} />
