import { createMachine, assign, spawn, send, interpret } from 'xstate';
/* https://stately.ai/viz/8f598538-e034-48f7-a3be-d2a53022a3b4 */
/*
Item Script:

{
  "type": "initialize",
  "item": {
    "name": "A"
  }
}

{
  "type": "edit"
}

{
  "type": "update",
  "item": { "name": "A", "description": "NEW" }
}

{
  "type": "rollback",
  "message": "Seriously?"
}

{
  "type": "update",
  "item": { "name": "A", "description": "ANOTHER" }
}

{
  "type": "commit"
}
*/

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
	context: { item: null, errors: null, cache: null },
	id: 'itemMachine',
	initial: 'uninitialized',
	states: {
		uninitialized: {
			initial: 'idle',
			states: {
				idle: {},
				loading: {
					invoke: {
						id: 'loadItem',
						src: 'loadItem',
						onDone: [
							{
								actions: ['log', 'load'],
								target: '#itemMachine.initialized'
							}
						],
						onError: [
							{
								target: '#itemMachine.uninitialized.error'
							}
						]
					}
				},
				error: {}
			},
			on: {
				initialize: {
					target: '#itemMachine.uninitialized.loading'
				}
			}
		},
		initialized: {
			initial: 'viewing',
			states: {
				viewing: {
					on: {
						edit: {
							target: '#itemMachine.initialized.editing'
						}
					}
				},
				editing: {
					type: 'parallel',
					states: {
						mutated: {
							initial: 'clean',
							states: {
								clean: {},
								dirty: {
									on: {
										rollback: {
											target: '#itemMachine.initialized.confirming'
										},
										commit: {
											cond: 'isValid',
											target: '#itemMachine.initialized.committing'
										}
									}
								}
							},
							on: {
								update: {
									actions: ['log', 'store'],
									target: '#itemMachine.initialized.editing.mutated.dirty'
								}
							}
						},
						validated: {
							initial: 'indeterminate',
							states: {
								indeterminate: {},
								valid: {},
								invalid: {}
							},
							on: {
								update: [
									{
										cond: 'isValid',
										target: '#itemMachine.initialized.editing.validated.valid'
									},
									{
										target: '#itemMachine.initialized.editing.validated.invalid'
									}
								]
							}
						}
					}
				},
				confirming: {
					invoke: {
						id: 'confirm',
						src: 'confirm'
					},
					on: {
						no: {
							target: '#itemMachine.initialized.editing.mutated.dirty'
						},
						yes: {
							actions: ['log', 'restoreCache'],
							target: '#itemMachine.initialized.editing'
						}
					}
				},
				committing: {
					invoke: {
						id: 'persistItem',
						src: 'persistItem',
						onDone: [
							{
								actions: ['log', 'load'],
								target: '#itemMachine.initialized'
							}
						],
						onError: [
							{
								target: '#itemMachine.uninitialized.error'
							}
						]
					}
				}
			}
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
		loadItem: (context, { item }) => fetchItemDummy(item.name),
		persistItem: ({ item }, event) => persistItemDummy(item),
		confirm: (context, event) => (callback, onReceive) => {
			const msg = event.message || 'Are you sure?';
			const choice = event.choice || 'yes';
			console.log(`${msg} ${choice}`);
			callback(choice);
			return () => {};
		}
	}
};

const itemMachine = 
/** @xstate-layout N4IgpgJg5mDOIC5QEsAuYC2BZAhgYwAtkA7MAOgFdiS1kcAbZAL0jPoHscISoBiCdqTIkAbuwDW5DlwCS6DIlAAHdrFqDFIAB6IATAGYAjAHYyABgtndZwwDYTt-QBoQAT0QBOfectmArIb61gAcfrq6AL4RLmiYuIQk5FQ0qHSMLBBsnNzEfGAATvns+WRK9DioAGbFGFmy8poqaqkaSNp6drZkugAsHh7GQfoewT2GLu4Igca6ZMH6QcbB4T0B+j1RMfLxRELJ1KkMzJC8KWnHjarqxJo6U8vehr0jA-p+y14TiIHBHnMLumM-TeIVsmxAsWw+F25DORwyZBEyDAAHceLxIGhLs1kK1QHd9GYemRjLY-LZ-H5jIEPCYvlMjMEyP1+oYvGEPD1bMFwZCdolhAdzgjMalcmQMBRUBVWNx8qhXLwivR6AAjfDibHXW6IYzGYl+XyGea6YLBYx+ekLP6Go0ms0eXnbaECuHpViingSqUyzJyhW8PDsDAYLFtJratp3DxWOY9fT6pYWPzrDz0wydf6LAJmYIUsJOuIuoRu46ZT3iyXS9AQXgUJQQGValo3KOIKmzfo9PXhfTBfzzdMLMxkPr9XSchbLPOFqEJEtC+Ee7hiqCIo6Nmt1htN8NXFs6hApkeDeOOc9mAb06mmMceKm2CkT4yz-kL2hLzJB4iVZD5UO5LwxDsM2uKtviiCEsSpLkpS1LDHSbjfBmnYsuS+p9im+ivsWsKLu6X6CL+-7oq4cCgXi7QIFBJJkvmVI0ohkwZqSzIssMATdoYNg4fOeEfgRZBBiGaCrvwgh4WIkilAUaiwKgciYBR4FUYEhjEgY8Z+GM-i5nY6ZmEEZALEEeZvIZhgBLxMKCgJZZCcGoaoGJBRFCUZQVNU-4yfkckKQ0e44pRdyWbYfxmLYzzrDYFJcumBimPMiw9P2RgGH4UTRCAwEQORbR8rhlDUPh9nIBA9BgMph7GkZeY3o+oQeI4ujphm3gmbo9j+LYXI9dZAr7HZCLSDkUBVW2Uz3n4xl+F4FILNy-RDmSxkAo+xqhAEPJZQVfFFaWIqFMU40QQgBhhTN7LGIZeoxfFKVkJ0s1LBmbL9XsxVDZAJ2qUCfxPH0vyDO8E7OEhUxWF0HV+LNvR9oE738YcglIqiPA-SFAQkoZuaGvGul5kObJsf0ekzACL47c6e0HcutCVj6NZCRVOAqRGB4TR2bHdjMBj9u8YPMWYSyjiycM2BhkRU0WNMlSKK5elWvpkP6kzKPuYGHtdI42ESwt5maEUteDTyBKtQRdeSvWU1sMs2bT5YKwz1bfYFkandpTJdj2fMDoLni0qLrK0mFZLbbbc723LdOruujCbqwJC5egJHELu6tBSpdzHiS6z6Oe+eXsY9I9V0d5hGEywZuHELU1HX2O-Ta4iBuyst-HGO6uExkxpFeZknqAT0v2Zfse8KVeH0iO2cj9kVs3rdM6IG6d0es1kDDXLmv3VIWvSVLTXe3bDPYnVgtLkeutHjex+3ZW+qvhpdKe+evxSV7gylTJH+EPVEoEGUL5viRsKGO6M3Yc1OilWYL8C7v2Lp-M2d4KREkJIaGcQDCoOwcj+P8AExoQM1hNc0rUeokjHLoEwbxtY112vXWeCJhJOVXKvbi5o4wJh6GMdYFomqtSaubXQs11i7xMNPB2q9HD0k6sSO895-BPEMmSRGq9hjpiZL4TRvgqSZQiEAA */
createMachine(itemDef, itemConfig);

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
			selected: (context, { item }) => {
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
