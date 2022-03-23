<script>
	export let item; // Actor

	import { validationStore, valid, named } from '$lib/validation';
	let validation;
	$: validation = validationStore(item); // Each instance will get a new

	import { metadata } from '$lib/service-store';
	import { local } from '$lib/l10n';
	import { coalesce } from '$lib/util';

	import Debug from './Debug.svelte';
	/** @type {HTMLElement} */
	let me;
</script>

<Debug store={item} ref={me} />
<section bind:this={me}>
	{#if $item.state.matches('initialized')}
		<h2>{coalesce($item.name?.trim(), '(empty)')}</h2>
		<form
			aria-label="Edit item"
			on:submit|preventDefault={(event) => item.send('commit')}
			on:input={(event) => {
				// TODO: Would FormData be more appropriate here?
				const form = event.currentTarget;
				item.send('update', {
					item: {
						itemid: form.itemid.value,
						name: form.name.value,
						description: form.description.value,
						updated: form.updated.value
					}
				});
			}}
		>
			<input type="hidden" id="itemid" name="itemid" value={$item.itemid} readonly />
			<div>
				<label for="name">Name</label>
				<input
					type="text"
					id="name"
					name="name"
					value={$item.name}
					readonly={!$item.state.matches('initialized.editing')}
					use:valid={named($validation, 'name')}
				/>
				{#if named($validation, 'name').length > 0}
					<div class="error" id="name-error">
						{#each named($validation, 'name') as { message }}
							{local(message)}
						{/each}
					</div>
				{/if}
			</div>
			<div>
				<label for="description">Description</label>
				<textarea
					id="description"
					name="description"
					readonly={!$item.state.matches('initialized.editing')}>{$item.description}</textarea
				>
			</div>
			<input type="hidden" name="updated" id="updated" value={coalesce($item.updated, '')} />
			{#if $item.state.matches('initialized.viewing')}
				<button type="button" class="default" on:click={(event) => item.send('edit')}
					>Edit {$item.name}</button
				>
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
				<button
					type="reset"
					disabled={!$item.state.matches('initialized.editing.mutated.dirty')}
					on:click|preventDefault={(event) => item.send('reset')}>Cancel</button
				>
			{/if}
		</form>
	{/if}
</section>

{#if $item.state.matches('initialized.editing.mutated.dirty.resetting')}
	<div>
		<p id="reset-message">{local(metadata($item.state).message)}</p>
		<button
			type="button"
			class="default"
			on:click={(event) => item.send(event.target.value)}
			value="no"
			aria-describedby="reset-message">{local(metadata($item.state).options[0])}</button
		>
		<button
			type="button"
			value="yes"
			on:click={(event) => item.send(event.target.value)}
			aria-describedby="reset-message">{local(metadata($item.state).options[1])}</button
		>
	</div>
{/if}

<style>
	form > div {
		display: flex;
		flex-direction: row;
		align-items: baseline;
		gap: 0 1em;

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

		transition-property: background-color, color, border-color;
		transition-duration: 0.1s;
		transition-timing-function: ease-in;
	}
	input[type='text']:read-only,
	textarea:read-only {
		border-color: transparent;
		pointer-events: none;
	}
	input[type='text']:invalid,
	textarea:invalid {
		background-color: var(--color-rose-100);
		color: var(--color-rose-600);
		border-color: var(--color-rose-600);
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
