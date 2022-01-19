This repo is an experiment to understand how to plumb [Svelte](https://svelte.dev) components with interrelated [XState](https://xstate.js.org) state machines to manage state. The goal is to declare as much of the _busisness logic_ in the state machine(s) and relegate the UI to pure _presentation logic_—bascially a giant switch statement over finite state. 

The use case for this example is a classic collection-detail. Initially you get a list of available items. Selecting one shows its detail and allows the user to edit.

The key insight leading me here was that XState actors (e.g. interpreted machines) are also Svelte stores. Unlike components accessing global stores, injecting stores into components lets XState handle the relationships between the backing state, for example, `spawn`ing child machines. With SvelteKit, you can even pre-render this on the server. 🤯

The app is made up of a page component that instantiates the backing state machine and delegates to UI components. Each component pushes its child components’ reactive state down, making them relatively straightforward to test and reason over. 

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