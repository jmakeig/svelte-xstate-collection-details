<script context="module">
	import { createItemsStore } from './_itemsMachine';
	export function load({ params, fetch }) {
		// Return a store here rather than an object?
		// const items = await fetch(`/items.json`).then((r) => r.json());
		const items = createItemsStore(async () => fetch(`/items.json`).then((r) => r.json()));
		items.send('initialize');
		return {
			props: { items }
		};
	}
</script>

<script>
	import { derived } from 'svelte/store';

	export let items;
	const selected = derived(items, ($items) => $items.context.selected);
</script>

<!-- <svelte:head>
	<title>Items • {$items.context.items.length}</title>
</svelte:head> -->

<pre>{JSON.stringify($items.context, null, 2)}</pre>

{#if $items.matches('initialized')}
	<pre>/items</pre>
	<pre>{JSON.stringify($items.context.items, null, 2)}</pre>
	<ul>
		{#each $items.context.items as item, i}
			<li>
				<a
					href="/items/{item.name}"
					on:click|preventDefault={(event) => {
						items.send('select', { item });
						//$items.context.send('initialize', item);
					}}>{item.name}</a
				>
			</li>
		{/each}
	</ul>
{/if}
{#if $items.matches('initialized.selection.selected')}
	<!-- https://github.com/annaghi/xstate-cameoparison-svelte-actors -->
	<!-- <button on:click={(evt) => selected.send('DEBUG')}>DEBUG</button> -->
	<pre>{JSON.stringify(
			Object.keys($selected).map((x) => [x, typeof selected[x]].join(': ')),
			null,
			2
		)}</pre>
{/if}
