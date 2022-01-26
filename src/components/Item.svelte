<script>
	export let item; // Actor
</script>

<section style="outline: solid 1px red; padding: 0.5em;">
	<h2>Item</h2>
	<form
		on:submit|preventDefault={(event) => console.log('submit')}
		on:input={(event) => {
			console.log(event.currentTarget);
			const it = event.currentTarget;
			item.send('update', { item: { name: it.name.value, description: it.description.value } });
		}}
	>
		<div>
			<label for="name">Name</label> <input id="name" name="name" value={$item.name} />
		</div>
		<div>
			<label for="description">Description</label>
			<textarea id="description" name="description">{$item.description}</textarea>
		</div>
	</form>
</section>
