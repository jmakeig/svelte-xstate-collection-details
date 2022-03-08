<script>
	export let store;

	let history = [];

	/**
	 * Determines states that aren’t represented “deeper” in the hierarchy as
	 * returned from `state.toStrings()`.
	 *
	 * @example unique(['a', 'a.b', 'a.b.c', 'a.b.d']) // ['a.b.c', 'a.b.d']
	 *
	 * @param states
	 */
	function* unique(states) {
		function is_unique(value, all) {
			return !all.some((state) => state.startsWith(value + '.'));
		}
		if (states.length > 1) {
			if (is_unique(states[0], states.slice(1))) yield states[0];
			yield* unique(states.slice(1));
		} else {
			yield states[0];
		}
	}

	import { onMount } from 'svelte';

	onMount(() => {
		if ('development' === import.meta.env.MODE) {
			store.service.subscribe((state) => {
				history = [{ state: state.toStrings(), timestamp: new Date() }, ...history];
			});
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

		<details>
			<summary>History ({history.length})</summary>
			{#if history.length}
				<button on:click={() => (history = [])}>Clear</button>
				<div class="table-container">
					<table>
						<thead>
							<tr><th scope="column">State</th><th scope="column">Timestamp</th></tr>
						</thead>
						<tbody>
							{#each history as entry}
								<tr>
									<td>
										<ul>
											{#each Array.from(unique(entry.state)) as value}
												<!-- Adds zero-width space to allow for wrapping -->
												<li>{value.split('.').join('\u200b.')}</li>
											{/each}
										</ul>
									</td>
									<td>{entry.timestamp.toISOString()}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</details>
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
		font-size: 0.75em;
	}
	details > details {
		position: static;
		top: 0;
		right: 0;
		font-size: inherit;
		box-shadow: none;
		width: auto;
	}
	pre {
		max-height: 20em;
		overflow: auto;
		padding: 0.5em;
		background-color: #efefef;
	}
	.table-container {
		max-height: 20em;
		overflow: scroll;

		border: solid 0.5px #eee;
		/* border-radius: 1em; */
		/* box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); */
	}

	table {
		position: relative; /* Needed for sticky headers */

		width: 100%;

		table-layout: fixed; /* Uses first row to size. This renders faster for regular tables. */
		border-spacing: 0;
		border-collapse: separate; /* https://stackoverflow.com/a/53559396/563324 */
	}

	th,
	td {
		padding: 0.5em;

		border-width: 0.5px;
		border-style: solid solid none none;
		border-color: #ccc;

		text-align: left;
		vertical-align: top;

		font-variant-numeric: tabular-nums; /* Size numbers so they’re easy to compare across rows. */
	}
	td {
		font-family: var(--font-monospace);
	}

	thead > tr > th:first-of-type,
	tbody > tr > *:first-child {
		border-left-style: solid;
	}

	thead th[scope='column'] {
		position: sticky; /* Fixed headers */
		z-index: 10;
		top: -1px; /* Compensate for the top border so there’s no gap when sticky. */

		background-color: #eee;
	}

	tbody > tr:last-of-type > * {
		border-bottom-style: solid;
	}

	td ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	td li {
		margin-bottom: 0.75em;
		padding-left: 1.5em;
		text-indent: -1.5em;
	}
	td li:last-of-type {
		margin-bottom: 0;
	}
	button {
		display: block;
		margin: 0.5em 0;
	}
</style>
