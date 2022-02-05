import { createMachine, assign, spawn, send, interpret } from 'xstate';
import { createItemMachine } from './_item';

export function createItemsMachine(fetch) {
	const itemsDef = {
		id: 'itemsMachine',
		context: {
			items: null,
			selected: null
		},
		initial: 'uninitialized',
		states: {
			uninitialized: {
				on: {
					initialize: {
						target: '.loading',
						internal: false
					}
				},
				initial: 'idle',
				states: {
					idle: {},
					loading: {
						invoke: {
							id: 'loadItems',
							src: 'loadItems',
							onDone: {
								target: '#itemsMachine.initialized',
								actions: [assign({ items: (context, event) => event.data })]
							},
							onError: {
								target: 'error'
							}
						}
					},
					error: {
						entry: [(context, event) => console.log('error in loadItems', context, event)]
					}
				}
			},
			initialized: {
				type: 'parallel',
				states: {
					selection: {
						initial: 'unselected',
						on: {
							/*
							{
								"type": "select",
								"item": {
									"name": "A"
								}
							}
							*/
							select: {
								target: '.selected',
								actions: [
									'selectItem',
									// (c, e) => console.log('After spawn', c, e),
									'initializeSelectedItem'
								]
							}
						},
						states: {
							unselected: {},
							selected: {
								on: {
									deselect: {
										target: 'unselected',
										actions: ['clearSelection']
									}
								}
							}
						}
					}
					/*
					filter: {
						initial: "empty",
						states: {
							empty: {
								on: {
									
								}
							},
							changing: {},
							filtered: {},
						},
					},
					*/
				}
			}
		}
	};

	function fetchItemsDummy(filter) {
		return Promise.resolve([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }]);
	}

	const itemsConfig = {
		actions: {
			selectItem: assign({
				selected: (context, { item }) => {
					const itemMachine = createItemMachine(fetch);
					const ref = spawn(itemMachine, `item-${item.name}`);
					ref.machine = itemMachine;
					return ref;
				}
			}),
			initializeSelectedItem: send(
				(context, event) => {
					//console.log("send", event);
					return { type: 'initialize', item: event.item };
				},
				{
					to: ({ selected }) => selected
				}
			),
			clearSelection: assign({
				selected: (context, event) => {
					context.selected.stop(); // Is this right?
					return null;
				}
			})
		},
		services: {
			//loadItems: (context, event) => fetchItemsDummy(context.filter)
			loadItems: (context, event) => fetch(`/items.json`).then((r) => r.json())
		}
	};
	return createMachine(itemsDef, itemsConfig);
}

import { serviceStore } from '$lib/service-store';

export function createItemsStore(fetch) {
	const machine = createItemsMachine(fetch);
	return serviceStore(interpret(machine).start(), 'items', itemsPropertiesSelector);
}

function itemsPropertiesSelector(context, key) {
	// console.log('itemsPropertiesSelector', context, key);
	return Object.assign(context[key], {
		// Getter to wrap the spawned child machine in a serviceStore()
		get selected() {
			// console.log('context.selected', context.selected);
			if (exists(context.selected)) {
				// console.log(context.selected.constructor.name);
				return serviceStore(context.selected, 'item');
			}
			return context.selected;
		}
	});
}

function exists(obj) {
	return obj !== null && obj !== undefined;
}
