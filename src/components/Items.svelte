<script>
	export let items;
	import Item from '$components/Item.svelte';

	import Debug from './Debug.svelte';
</script>

<section style="outline: solid 1px red; padding: 0.5em;">
	<Debug store={items} />
	<h1>Items</h1>
	{#if $items.state.matches('initialized')}
		<pre>/items</pre>
		<ul>
			{#each Array.from($items) as item, i}
				<li>
					<a
						href="/items/{item.name}"
						on:click|preventDefault={(event) => {
							items.send('select', { id: item.id });
						}}>{item.name}</a
					>
				</li>
			{/each}
		</ul>
	{/if}
	{#if $items.state.matches('initialized.selection.selected')}
		<Item item={$items.selected} />
	{/if}
</section>
