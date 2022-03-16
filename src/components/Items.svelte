<script>
	export let items;
	import Item from '$components/Item.svelte';

	import Debug from './Debug.svelte';
	let me;
</script>

<section bind:this={me}>
	<Debug store={items} ref={me} />
	<h1>Items</h1>
	{#if $items.state.matches('initialized')}
		<pre>/items</pre>
		<ul>
			{#each Array.from($items) as item, i}
				<li>
					<a
						href="/items/{item.name}"
						on:click|preventDefault={(event) => {
							items.send('select', { id: item.itemid });
						}}>{item.name}</a
					>
				</li>
			{/each}
		</ul>
	{/if}
</section>
<article>
	{#if $items.state.matches('initialized.selection.selected')}
		<Item item={$items.selected} />
	{/if}
</article>
