<script>
	import { matchesState, State } from 'xstate';

	export let item; // Actor
</script>

<section style="outline: solid 1px red; padding: 0.5em;">
	<h2>Item: {JSON.stringify($item.state.value, null, 2)}</h2>
	<form
		on:submit|preventDefault={(event) => console.log('submit')}
		on:input={(event) => {
			console.log(event.currentTarget);
			const it = event.currentTarget;
			item.send('update', { item: { name: it.name.value, description: it.description.value } });
		}}
	>
		{#if $item.state.matches('initialized.validated.invalid')}
			<output>Yo! There are some errors: {$item.state.context.error.length}</output>
		{/if}
		<div>
			<label for="name">Name</label> <input id="name" name="name" value={$item.name} />
		</div>
		<div>
			<label for="description">Description</label>
			<textarea id="description" name="description">{$item.description}</textarea>
		</div>
		<button
			type="submit"
			disabled={!(
				$item.state.matches('initialized.mutated.dirty') &&
				$item.state.matches('initialized.validated.valid')
			)}>Save</button
		>
	</form>
</section>
