<script>
	export let items;
	/*
	let selected;
	items.onTransition((state) => {
		if (state.context && state.context.selected) {
			console.log(state.context.selected);
			selected = state.context.selected;
		}
	});
	*/
	import { derived } from 'svelte/store';
	const selected = derived(items, ($items) => $items.context.selected);
	import Item from '$components/Item.svelte';
</script>

<h1>Items</h1>
{#if $items.matches('initialized')}
	<pre>/items</pre>
	<!-- <pre>{JSON.stringify($items.context.items, null, 2)}</pre> -->
	<ul>
		{#each $items.context.items as item, i}
			<li>
				<a
					href="/items/{item.name}"
					on:click|preventDefault={(event) => {
						items.send('select', { item });
						$selected.send('initialize', item);
					}}>{item.name}</a
				>
			</li>
		{/each}
	</ul>
{/if}
{#if $items.matches('initialized.selection.selected')}
	<Item item={$selected} />
{/if}
