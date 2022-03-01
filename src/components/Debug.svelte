<script>
	export let store;

	import { onMount } from 'svelte';

	onMount(() => {
		if ('development' === import.meta.env.MODE) {
			store.service.subscribe((state) => {});
		}
	});

	function skip(k, v) {
		if ('state' === k) return undefined;
		return v;
	}
</script>

{#if 'development' === import.meta.env.MODE}
	<details open>
		<summary>{$store.state.toStrings().slice(-1)}</summary>
		State
		<pre>{JSON.stringify($store.state.value, null, 2)}</pre>
		Context
		<pre>{JSON.stringify($store, skip, 2)}</pre>
	</details>
{/if}

<style>
	details {
		position: absolute;
		top: 1em;
		right: 1em;
		width: 40em;
		background: white;
		padding: 0.5em;
		border: solid 0.5px #ddd;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
	}
	pre {
		max-height: 20em;
		overflow: auto;
		padding: 0.5em;
		background-color: #eee;
	}
</style>
