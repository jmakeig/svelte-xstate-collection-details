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
			return initialize();
		}
	});

	/**
	 * The top-level wrapper
	 * @type {HTMLDetailsElement}
	 * */
	let instance;

	/**
	 * @type {HTMLElement | null}
	 */
	export let ref = null;

	function initialize() {
		const clazz = 'DEBUG-container';
		let container = document.querySelector('.' + clazz);
		if (!container) {
			container = document.createElement('div');
			container.classList.add(clazz);
			document.querySelector('body').appendChild(container);

			const button = document.createElement('button');
			button.textContent = ' ';
			button.type = 'button';
			button.classList.add('toggle');
			button.title = 'Toggle';

			const toggleDisplay = (event) => {
				container.classList.toggle('hidden');
			};
			button.addEventListener('click', toggleDisplay);
			container.appendChild(button);
		}
		container.appendChild(instance);

		return () => {
			/* remove listeners */
		};
	}

	function showRef(node) {
		return (event) => {
			if (node) node.style.outline = 'solid 4px pink';
		};
	}
	function hideRef(node) {
		return (event) => {
			if (node) node.style.outline = 'revert';
		};
	}

	function skip(k, v) {
		if ('state' === k) return undefined;
		return v;
	}
</script>

{#if 'development' === import.meta.env.MODE}
	<details class="Debug" open bind:this={instance}>
		<summary
			on:mouseover={showRef(ref)}
			on:focus={showRef(ref)}
			on:mouseout={hideRef(ref)}
			on:blur={hideRef(ref)}
		>
			{$store.state.toStrings().slice(-1)}
		</summary>
		<h2>State</h2>
		<pre>{JSON.stringify($store.state.value, null, 2)}</pre>
		<h2>Context</h2>
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
	:global(.DEBUG-container) {
		box-sizing: border-box;
		position: absolute;
		top: 0;
		right: 0;
		width: 25%;
		min-width: 20em;
		padding: 0;
		padding-left: 1.5em;
		outline: solid 0.5px #ccc;
		background: #efefef;
		transition: right 0.5s ease-in-out;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

		color: #666;
		font-size: 0.75em;
	}
	:global(.DEBUG-container.hidden) {
		right: calc(12px - max(25%, 20em)); /* buttton - MAX(width, min-width) */
		overflow: hidden;
	}
	:global(.DEBUG-container button.toggle) {
		position: absolute;
		left: 0;
		width: 12px;
		height: 100%;
		top: 0;
		border: 0;
		background: #666;
	}
	details.Debug[open] {
		margin-bottom: 1em;
	}
	details.Debug > summary {
		cursor: default;
		font-weight: bold;
		background: #999;
		color: #333;
		padding: 0.5em;
		margin: 0 -0.5em 0 -1.5em;
	}

	details {
		padding-left: 1em;
	}
	details > summary {
		margin-left: -1em;
	}
	details h2 {
		font-size: inherit;
		font-weight: bold;
		margin: 0.25em 0;
		line-height: 1;
	}

	pre {
		max-height: 20em;
		overflow: auto;
		margin: 0.5em 0;
		padding: 0;
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
