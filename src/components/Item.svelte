<script>
	export let item; // Actor
</script>

<h2>Item</h2>
<pre>{JSON.stringify($item.context, null, 2)}</pre>
<label for="name">Name</label> <input id="name" name="name" value={$item.context.item.name} />
