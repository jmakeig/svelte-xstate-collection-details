import { createMachine, assign } from 'xstate';

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

//export const itemMachine = createMachine(itemDef, itemConfig);
export function createItemMachine(fetch) {
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
			// cache: assign({ cache: (context, { item }) => item }),
			restoreCache: assign({ item: (context, event) => context.cache })
			// clearCache: assign({ cache: null }),
			// unload: assign({ item: null, cache: null, errors: null })
		},
		guards: {
			isValid: (context, event) => 0 === Math.trunc((Math.random() * 10) % 2)
		},
		services: {
			// TODO
			loadItem: (context, { item }) => fetchItemDummy(item.name),
			// TODO
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

	return createMachine(itemDef, itemConfig);
}
