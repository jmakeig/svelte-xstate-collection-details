import { createMachine, assign, spawn, send, interpret } from 'xstate';
// import { actions } from 'xstate';
// const { stop } = actions;

const itemDef = {
	id: 'itemMachine',
	context: {
		item: null,
		errors: null,
		cache: null
	},
	initial: 'uninitialized',
	on: {
		DEBUG: {
			actions: [(c, e) => console.log(c)]
		}
	},
	states: {
		uninitialized: {
			on: {
				/*
        {
          "type": "initialize",
          "item": { "name": "A"}
        }
        */
				initialize: {
					target: 'initialized',
					actions: ['store', 'cache']
				}
			}
		},
		initialized: {
			id: 'initialized',
			type: 'parallel',
			on: {
				/*
        {
          "type": "rehydrate",
          "item": { "name": "C" }
        }
        */
				// TODO: Isn’t this just the same as initialize?
				rehydrate: {
					target: ['.validated.indeterminate', '.mutated.clean'],
					actions: ['store', 'cache']
				}
			},
			states: {
				mutated: {
					initial: 'clean',
					on: {
						/*
            {
              "type": "update",
              "item": { "name": "B" }
            }
            */
						update: {
							target: '.dirty',
							actions: ['store', (c, e) => console.log('update', c)]
						}
					},
					states: {
						clean: {},
						dirty: {
							on: {
								/*
                {
                  "type": "cancel",
                  "confirmation": true
                }
                */
								cancel: [
									{
										target: ['#initialized.validated.indeterminate', '#initialized.mutated.clean'],
										cond: 'confirm',
										actions: ['restoreCache']
									}
								]
							}
						}
					}
				},
				validated: {
					initial: 'indeterminate',
					on: {
						update: [{ target: '.valid', cond: 'isValid' }, { target: '.invalid' }]
					},
					states: {
						indeterminate: {},
						valid: {},
						invalid: {}
					}
				}
			}
		}
	}
};

const itemConfig = {
	actions: {
		store: assign({ item: (context, event) => event.item }),
		cache: assign({ cache: (context, event) => event.item }),
		restoreCache: assign({ item: (context, event) => context.cache }),
		clearCache: assign({ cache: null })
	},
	guards: {
		isValid: (context, event) => 0 === Math.trunc((Math.random() * 10) % 2),
		confirm: (context, event) => !!event.confirmation
	}
};

const itemMachine = createMachine(itemDef, itemConfig);

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
const itemsConfig = {
	actions: {
		selectItem: assign({
			selected: (context, event) => {
				// console.log('spawn', context, event);
				const ref = spawn(itemMachine, `item-${event.item.name}`);
				ref.machine = itemMachine;
				return ref;
			}
		}),
		initializeSelectedItem: send(
			{ type: 'initialize', item: { name: 'A' } },
			{ to: (context) => context.selected }
		),
		clearSelection: assign({
			selected: (context, event) => {
				context.selected.stop(); // Is this right?
				return null;
			}
		})
	},
	services: {
		loadItems: (context, event) => fetchItemsDummy(context.filter)
	}
};
const itemsMachine = createMachine(itemsDef, itemsConfig);

function fetchItemsDummy(filter) {
	return Promise.resolve([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }]);
}

import { serviceStore } from '$lib/service-store';

export function createItemsStore(fetchItems) {
	const machine = createMachine(itemsDef, {
		...itemsConfig,
		services: {
			loadItems: (context, event) => fetchItems(context.filter)
		}
	});
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
	return obj !== null && obj !== void 0;
}
