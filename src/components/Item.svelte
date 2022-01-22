<script>
	import { log } from 'xstate/lib/actions';

	export let item; // Actor
</script>

<h2>Item</h2>
<pre>{JSON.stringify($item.context, null, 2)}</pre>
<form
	on:submit|preventDefault={(event) => console.log('submit')}
	on:input={(event) => {
		console.log(event.currentTarget);
		const it = event.currentTarget;
		item.send('update', { item: { name: it.name.value, description: it.description.value } });
	}}
>
	<div>
		<label for="name">Name</label> <input id="name" name="name" value={$item.context.item.name} />
	</div>
	<div>
		<label for="description">Description</label>
		<textarea id="description" name="description">{$item.context.item.name}</textarea>
	</div>
</form>
