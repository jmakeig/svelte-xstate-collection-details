<script>
	export let store;

	function less(obj) {
		if (null === obj || undefined === obj) return obj;
		if (Array.isArray(obj)) return obj;
		const copy = Object.assign({}, obj);
		delete copy.state;
		return copy;
	}
</script>

<details>
	<summary>{$store.state.toStrings().slice(-1)}</summary>
	State
	<pre>{JSON.stringify($store.state.value, null, 2)}</pre>
	Context
	<pre>{JSON.stringify(less($store), null, 2)}</pre>
</details>

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
