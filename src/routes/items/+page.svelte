<script context="module">
</script>

<script>
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

<svelte:head>
	<title>Items • {$items.length}</title>
</svelte:head>

<!-- <pre>{JSON.stringify($items.context, null, 2)}</pre> -->
<Items {items} />
