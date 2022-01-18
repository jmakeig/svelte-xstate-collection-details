This repo is an exercise to understand how to plumb [Svelte](https://svelte.dev) components with interrelated [XState](https://xstate.js.org) state machines managing state. The goal is to declare as much of the _busisness logic_ as possible in the state machine(s) and relegate the UI to pure _presentation logic_.  The use case here is a classic collection-detail. Initially you get a list of available items. Selecting one shows its detail and allows the user to edit.

The key insight was that XState actors (e.g. interpreted machines) are also Svelte stores. Passing stores between components allows you to let XState handle the relationships between the backing state, for example, `spawn`ing child machines. As @Rich-Harris’s comment above indicates, it’s possible to hydrate server-generated content with “real” objects, not just JSON-serializable data. 🤯

### Page component

Generate the initial view on the server, wrapping the fetched data in a state machine.

```svelte
<script context="module">
	import { createItemsStore } from './_itemsMachine';
	export function load({ params, fetch }) {
		// Create a state machine to manage transition logic
		const items = createItemsStore(async () => fetch(`/items.json`).then((r) => r.json()));
		// Tell the machine to initialize. Under the covers it uses the above `fetch` callback.
		items.send('initialize');
		return {
			props: { items } // XState actors are Svelte stores
		};
	}
</script>

<script>
	export let items;
	import Items from '$components/Items.svelte';
</script>
<Items {items} />
```

### State machine

When an item is selected, spawn a new machine and store it in the context.

```javascript
// _itemsMachine.js
//…
on: {
	select: {
		target: '.selected',
		actions: [
			'selectItem',
			'initializeSelectedItem'
		]
	}
}
//…
actions: {
	selectItem: assign({
		selected: (context, event) => {
			return spawn(itemMachine, `item-${event.item.name}`);
		}
	})
}
```

### Parent component

Derive the selected item actor/store from the parent’s context. (See `spawn` above.)

```svelte
<!-- $components/Items.svelte -->
<script>
	export let items; // XState actor/Svelte store
	import { derived } from 'svelte/store';
	// Derive the spawned child actor/store from the parent actor’s context
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
	<!-- Pass the actor/store as a param to the child component -->
	<Item item={$selected} />
{/if}
```

### Child component

```svelte
<!-- $components/Item.svelte -->
<script>
	export let item; // XState actor/Svelte store
</script>

<h2>Item</h2>
<pre>{JSON.stringify($item.context, null, 2)}</pre>
<label for="name">Name</label> <input id="name" name="name" value={$item.context.item.name} />
```