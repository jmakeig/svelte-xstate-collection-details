<script>
	export let item; // Actor

	import { State } from 'xstate';
	import Debug from './Debug.svelte';
</script>

<section style="outline: solid 1px red; padding: 0.5em; position: relative;">
	<Debug store={item} />
	<h2>Item</h2>
	{#if $item.state.matches('initialized')}
		<form
			on:submit|preventDefault={(event) => console.log('submit')}
			on:input={(event) => {
				console.log(event.currentTarget);
				const it = event.currentTarget;
				item.send('update', { item: { name: it.name.value, description: it.description.value } });
			}}
		>
			{#if $item.state.matches('initialized.validated.invalid')}
				<output>Yo! There are some errors: {$item.state.context.errors}</output>
			{/if}
			<div>
				<label for="name">Name</label>
				<input
					type="text"
					id="name"
					name="name"
					value={$item.name}
					readonly={!$item.state.matches('initialized.editing')}
				/>
			</div>
			<div>
				<label for="description">Description</label>
				<textarea
					id="description"
					name="description"
					readonly={!$item.state.matches('initialized.editing')}>{$item.description}</textarea
				>
			</div>
			{#if $item.state.matches('initialized.viewing')}
				<button class="default" on:click={(event) => item.send('edit')}>Edit {$item.name}</button>
			{/if}
			{#if $item.state.matches('initialized.editing')}
				<button
					type="submit"
					class="default"
					disabled={!(
						$item.state.matches('initialized.editing.mutated.dirty') &&
						!$item.state.matches('initialized.editing.validated.invalid')
					)}>Save</button
				>
				<button disabled={!$item.state.matches('initialized.editing.mutated.dirty')}>Cancel</button>
			{/if}
		</form>
	{/if}
</section>

<style>
	form > div {
		display: flex;
		flex-direction: row;
		align-items: baseline;

		margin: 1em 0;
	}
	label {
		width: 12em;
	}
	input,
	textarea {
		font-family: inherit;
		font-size: 1rem;
	}
	input[type='text'],
	textarea {
		border: solid 1px #ddd;
		border-radius: 0.4em;
		padding: 0.5em;
		width: 20em;
	}
	input[type='text']:read-only,
	textarea:read-only {
		border-color: transparent;
		pointer-events: none;
	}
	textarea {
		min-height: 4em;
	}
	button {
		font-size: inherit;
		padding: 0.5em 1em;
		border: none;
		border-radius: 0.8em;
		background-color: white;
		color: var(--color-zinc-600);
	}
	button:disabled {
		color: var(--color-zinc-300);
	}
	button:not([disabled]):hover {
		background-color: var(--color-zinc-200);
	}
	button:not([disabled]):active {
		transform: translateX(1px) translateY(1px);
	}
	button.default {
		color: var(--color-sky-50);
		background-color: var(--color-sky-600);
	}
	button.default:disabled {
		color: var(--color-sky-200);
		background-color: var(--color-sky-50);
	}
</style>
