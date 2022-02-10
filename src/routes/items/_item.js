import { createMachine, assign } from 'xstate';

function fetchItemDummy(id) {
	const item = {
		name: id,
		description: `Item ${id}`
	};
	return Promise.resolve(item);
}

function persistDummy(item) {
	return Promise.resolve(Object.assign({ updated: new Date().toISOString() }, item));
}

function validate(item) {
	const validation = [];
	if ('blah' === item.name) {
		validation.push({ for: 'name', message: `Name cant be 'blah'` });
	}
	return Promise.resolve(validation);
}

/*

{
	"type": "initialize",
	"item": {
		"name": "A"
	}
}

{
	"type": "edit"
}

// Valid

{
	"type": "update",
	"item": {
		"name": "A",
		"description": "Another"
	}
}

// Invalid

{
	"type": "update",
	"item": {
		"name": "blah",
		"description": "Another"
	}
}

// Valid, again

{
	"type": "update",
	"item": {
		"name": "A",
		"description": "Yet another"
	}
}

// Persisted

{
  "type":"commit"
}

*/
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
							id: 'load',
							src: 'load',
							onDone: [
								{
									actions: ['log', 'load'],
									target: '#initialized'
								}
							],
							onError: [
								{
									target: 'error'
								}
							]
						}
					},
					error: {}
				},
				on: {
					initialize: {
						target: '.loading'
					}
				}
			},
			initialized: {
				id: 'initialized',
				initial: 'viewing',
				states: {
					viewing: {
						on: {
							edit: {
								target: 'editing'
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
												target: '#confirming'
											},
											commit: {
												cond: 'is_valid',
												target: '#committing'
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
									validating: {
										entry: ['clear_validation'],
										invoke: {
											src: 'validate',
											onDone: [
												{
													target: 'valid',
													cond: (context, { data }) => 0 === data.length,
													actions: ['store_validation']
												},
												{
													target: 'invalid',
													cond: (context, { data }) => 0 < data.length,
													actions: ['store_validation']
												}
											],
											onError: {
												// target: '#error',
												// actions: ['store_error']
											}
										}
									},
									valid: {},
									invalid: {}
								},
								on: {
									update: {
										target: '.validating'
									}
								}
							}
						}
					},
					confirming: {
						id: 'confirming',
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
						id: 'committing',
						invoke: {
							id: 'persist',
							src: 'persist',
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
			restoreCache: assign({ item: (context, event) => context.cache }),
			// clearCache: assign({ cache: null }),
			// unload: assign({ item: null, cache: null, errors: null })
			clear_validation: assign({
				validation: []
			}),
			store_validation: assign({
				validation: ({ validation }, { data }) => [...validation, ...data]
			})
		},
		guards: {
			is_valid: (context, event, { state }) =>
				!state.matches('initialized.editing.validated.invalid')
		},
		services: {
			// TODO
			load: (context, { item }) => fetchItemDummy(item.name),
			validate: ({ item }, event) => validate(item),
			// TODO
			persist: ({ item }, event) => persistDummy(item),
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

//const M = createItemMachine(() => {});
