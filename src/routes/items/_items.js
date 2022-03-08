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
									},
									updated_item: {
										// https://spectrum.chat/statecharts/general/actions-without-transitions~43393e12-6989-4bf1-a5ca-eb53752ca8ae
										internal: true,
										actions: ['update_item']
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

	const itemsConfig = {
		actions: {
			selectItem: assign({
				selected: (context, { id }) => {
					const itemMachine = createItemMachine(fetch);
					const ref = spawn(itemMachine, `item-${id}`);
					// ref.machine = itemMachine;
					return ref;
				}
			}),
			initializeSelectedItem: send(
				(context, { id }) => ({
					type: 'initialize',
					id
				}),
				{
					to: ({ selected }) => selected
				}
			),
			clearSelection: assign({
				selected: (context, event) => {
					context.selected.stop(); // Is this right?
					return null;
				}
			}),
			update_item: assign({
				items: (context, { item }) =>
					context.items.map((existing) => {
						// console.log(item, existing);
						if (existing.itemid === item.itemid) return item;
						else return existing;
					})
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
	const options = { devTools: 'development' === import.meta.env.MODE };
	return serviceStore(interpret(machine, options).start(), 'items', itemsPropertiesSelector);
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
