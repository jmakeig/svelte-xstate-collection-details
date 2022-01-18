import { createMachine, assign, spawn, send, actions, interpret } from 'xstate';
const { stop } = actions;

const itemDef = {
	id: 'itemMachine',
	context: {
		item: null,
		errors: null,
		cache: null
	},
	initial: 'uninitialized',
	states: {
		DEBUG: {
			actions: [(c, e) => console.log(c)]
		},
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
					actions: [
						//(c, e) => console.log(c, e),
						'store',
						'cache'
					]
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
				// Isn’t this just the same as initialize?
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
							actions: ['store']
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
						onError: {}
					}
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
							actions: ['selectItem', 'initializeSelectedItem']
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
			selected: (context, event) => spawn(itemMachine, `item-${event.item.name}`)
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

export function createItemsStore(fetchItems) {
	const machine = createMachine(itemsDef, {
		...itemsConfig,
		services: {
			loadItems: (context, event) => fetchItems(context.filter)
		}
	});
	return interpret(machine).start();
}
