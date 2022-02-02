import { createMachine, assign, spawn, send, interpret } from 'xstate';
// import { actions } from 'xstate';
// const { stop } = actions;

function fetchItemsDummy(filter) {
	return Promise.resolve([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }]);
}

function fetchItemDummy(id) {
	const item = {
		name: id,
		description: `Item ${id}`
	};
	return Promise.resolve(item);
}

function persistItemDummy(item) {
	return Promise.resolve(Object.assign({ updated: new Date().toISOString() }, item));
}

const itemDef = {
	id: 'itemMachine',
	context: {
		item: null,
		errors: null,
		cache: null
	},
	initial: 'uninitialized',
	/*
  on: {
    DEBUG: {
      actions: [(c, e) => console.log(c)],
    },
  },
  */
	states: {
		uninitialized: {
			id: 'uninitialized',
			on: {
				/*
        {
          "type": "initialize",
          "id": "X"
        }
        */
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
						id: 'loadItem',
						src: 'loadItem',
						onDone: {
							target: '#initialized',
							actions: ['log', 'load']
						},
						onError: {
							target: 'error'
						}
					}
				},
				error: {
					id: 'error',
					actions: [
						assign({
							errors: (context, event) => [event.error]
						})
					]
				}
			}
		},
		initialized: {
			id: 'initialized',
			type: 'parallel',
			states: {
				mutated: {
					initial: 'clean',
					on: {
						/*
            {
              "type": "update",
              "item": { "name": "B", "description": "Some B" }
            }
            */
						update: {
							target: '.dirty',
							actions: ['log', 'store']
						}
					},
					states: {
						clean: {},
						dirty: {
							id: 'dirty',
							on: {
								/*
                {
                  "type": "close",
                }
                */
								close: {
									target: '.confirming'
								},
								save: {
									target: '.saving',
									cond: 'isValid' // Is this right?
								}
							},
							states: {
								saving: {
									invoke: {
										src: 'persistItem',
										onDone: {
											target: '#initialized',
											actions: ['log', 'load']
										},
										onError: {
											target: '#error'
										}
									}
								},
								confirming: {
									invoke: {
										src: 'confirm'
									},
									on: {
										no: {
											target: '#dirty'
										},
										yes: {
											target: '#unloaded'
										}
									}
								}
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
		},
		unloaded: {
			id: 'unloaded',
			entry: ['log', 'unload'],
			type: 'final'
		}
	}
};

const itemConfig = {
	actions: {
		log: (c, e) => console.log(e.type, c, e),
		load: assign((context, { data }) => ({
			item: data, // "store"
			cache: data, // "cache"
			errors: null
		})),
		store: assign({ item: (context, { item }) => item }),
		cache: assign({ cache: (context, { item }) => item }),
		restoreCache: assign({ item: (context, event) => context.cache }),
		clearCache: assign({ cache: null }),
		unload: assign({ item: null, cache: null, errors: null })
	},
	guards: {
		isValid: (context, event) => 0 === Math.trunc((Math.random() * 10) % 2)
	},
	services: {
		loadItem: (context, { id }) => fetchItemDummy(id),
		persistItem: ({ item }, event) => persistItemDummy(item),
		confirm: (context, event) => (callback, onReceive) => {
			callback('yes');
			return () => {};
		}
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

/****************************************************************/

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
