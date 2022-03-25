<script>
	export let items;
	import Item from '$components/Item.svelte';

	import Debug from './Debug.svelte';
	let me;
</script>

<Debug store={items} ref={me} />
<main>
	<section bind:this={me}>
		{#if $items.state.matches('initialized')}
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
	{#if $items.state.matches('initialized.selection.selected')}
		<article>
			<Item item={$items.selected} />
		</article>
	{/if}
</main>

<style>
	main {
		display: grid;
		grid-template-areas: 'items detail';
		grid-template-columns: 10em 1fr;
		grid-column-gap: 1em;

		height: 100vh;
		padding: 1em;
		background-color: var(--color-zinc-200);
	}
	main ul {
		list-style: none;
		padding: 0 0 0 2em;
	}
	main ul > li {
		margin: 0.5em 0;
	}
	main a:link {
		color: var(--color-zinc-600);
		text-decoration: none;
	}
	section {
		grid-area: items;
		/* background: yellow; */
	}
	article {
		grid-area: detail;
		/* background: orange; */
	}
</style>
