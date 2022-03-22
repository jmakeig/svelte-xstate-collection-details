import { createMachine, assign, sendParent, actions } from 'xstate';
const { raise } = actions;

export function createItemMachine(fetch) {
	/** @type {import('xstate').MachineConfig} */
	const itemDef = {
		id: 'Item',
		preserveActionOrder: true,
		initial: 'uninitialized',
		states: {
			uninitialized: {
				on: {
					initialize: {
						target: '#Item.loading'
					},
					unload: {
						target: '#Item.unloaded'
					}
				}
			},
			initialized: {
				initial: 'editing',
				states: {
					viewing: {
						on: {
							edit: {
								target: '#Item.initialized.editing'
							}
						}
					},
					editing: {
						type: 'parallel',
						states: {
							mutated: {
								initial: 'clean',
								states: {
									// updating: {
									// 	on: {
									// 		update: {
									// 			type: 'internal'
									// 		}
									// 	},
									// 	after: {
									// 		debounce_mutate: {
									// 			actions: ['log', 'store'], // FIXME: By the time we get here the update event is gone (POOF!)
									// 			target: '#Item.initialized.editing.mutated.dirty'
									// 		}
									// 	}
									// },
									clean: {
										entry: ['clear_cache', 'reset_validation'],
										on: {
											// update: { target: 'updating' },
											update: {
												target: '#Item.initialized.editing.mutated.dirty'
												// actions: ['log', 'store']
											},
											view: {
												target: '#Item.initialized.viewing'
											},
											unload: {
												target: '#Item.unloaded'
											}
										}
									},
									dirty: {
										entry: ['fill_cache', 'store'],
										initial: 'idle',
										states: {
											// updating: {
											// 	on: {
											// 		update: {
											// 			type: 'internal'
											// 		}
											// 	},
											// 	after: {
											// 		debounce_mutate: {
											// 			actions: ['log', 'store'], // Above debouncing note
											// 			target: '#Item.initialized.editing.mutated.dirty'
											// 		}
											// 	}
											// },
											resetting: {
												//entry: 'resetting',
												on: {
													no: {
														internal: true,
														target: '#Item.initialized.editing.mutated.dirty.idle'
													},
													yes: {
														actions: 'restore_cache',
														target: '#Item.initialized.editing.mutated.clean'
													}
												},
												meta: {
													message: {
														en: 'Are you sure you want to cancel your edits? '
													},
													options: [
														{ en: 'No', fr: 'Non' },
														{ en: 'Yes', fr: 'Oui' }
													]
												}
											},
											unloading: {
												entry: 'unloading',
												on: {
													no: {
														internal: true,
														target: '#Item.initialized.editing.mutated.dirty.idle'
													},
													yes: {
														target: '#Item.unloaded'
													}
												},
												meta: {
													message: {
														en: 'You have unsaved changes. Are you sure you want to continue? You’ll lose your changes.'
													},
													options: {
														en: ['No', 'Yes']
													}
												}
											},
											idle: {
												on: {
													// update: {
													// 	target: '#Item.initialized.editing.mutated.dirty.updating'
													// },
													update: {
														target: '#Item.initialized.editing.mutated.dirty',
														actions: ['log', 'store']
													},
													commit: {
														cond: 'is_valid_state',
														target: '#Item.initialized.saving'
													},
													reset: {
														target: '#Item.initialized.editing.mutated.dirty.resetting'
													},
													unload: {
														target: '#Item.initialized.editing.mutated.dirty.unloading'
													}
												}
											}
										}
									}
								}
							},
							validated: {
								initial: 'indeterminate',
								exit: ['clear_validation'],
								states: {
									indeterminate: {},
									valid: {},
									invalid: {},
									validating: {
										entry: ['clear_validation'],
										invoke: {
											src: 'validate',
											onDone: [
												{
													target: '#Item.initialized.editing.validated.valid',
													cond: 'is_valid',
													actions: ['store_validation']
												},
												{
													target: '#Item.initialized.editing.validated.invalid',
													actions: ['store_validation']
												}
											],
											onError: {
												target: '#Item.error'
											}
										}
									},
									updating: {
										// entry: ['log'],
										on: {
											update: {
												// type: 'internal'
											},
											done: {}
										},
										after: {
											debounce_validate: {
												target: '#Item.initialized.editing.validated.validating'
											}
										}
									}
								},
								on: {
									update: {
										target: '#Item.initialized.editing.validated.updating'
									},
									invalidate: {
										target: '#Item.initialized.editing.validated.indeterminate'
									}
								}
							}
						}
					},
					saving: {
						invoke: {
							src: 'persist',
							id: 'persist',
							onDone: [
								{
									target: '#Item.initialized.editing',
									actions: ['log', 'store', 'notify']
								}
							],
							onError: [
								{
									actions: 'error',
									target: '#Item.error'
								}
							]
						}
					}
				}
			},
			loading: {
				invoke: {
					src: 'load',
					id: 'load',
					onDone: [
						{
							actions: 'store',
							target: '#Item.initialized'
						}
					],
					onError: [
						{
							actions: 'error',
							target: '#Item.error'
						}
					]
				}
			},
			unloaded: {
				entry: [
					(context, event) => {
						console.log('unloaded', event);
					}
				],
				exit: ['unload'],
				type: 'final'
			},
			error: {
				entry: ['error']
			}
		}
	};
	itemDef.context = {
		item: null,
		cache: null,
		validation: [],
		errors: null
	};

	/** @type {import('xstate').InternalMachineOptions<any, any, any, any, any>} */
	const itemConfig = {
		actions: {
			log: (context, event) => console.log('log', context, event),
			fill_cache: assign({
				cache: ({ item }, event) => item || { dummy: 'dummy' }
			}),
			clear_cache: assign({ cache: null }),
			restore_cache: assign({
				item: ({ cache }) => cache
			}),
			store: assign({
				item: (context, event) => event.item || event.data //|| { dummy: 'dummy-' + new Date().toISOString() }
			}),
			notify: sendParent((context, event) => ({ type: 'updated_item', item: event.data })),
			reset_validation: raise('invalidate'),
			clear_validation: assign({
				validation: []
			}),
			store_validation: assign({
				validation: ({ validation }, { data }) => [...validation, ...data]
			}),
			unload: assign({ item: null, cache: null }),
			error: assign({
				error: (context, event) => event.error || event.data || 'Oops!'
			})
		},
		guards: {
			// is_valid: () => Math.trunc(Math.random() * 10) % 3 !== 0,
			is_valid: (context, { data }) => 0 === data.length,
			is_valid_state: (context, event, { state }) =>
				state.matches('initialized.editing.validated.valid')
		},
		services: {
			load: (context, { id }) => fetch(`/items/${id}.json`).then((r) => r.json()),
			persist: ({ item }) =>
				fetch(`/items/${item.itemid}.json`, {
					method: 'put',
					body: JSON.stringify(item)
				}).then((r) => r.json()),
			// validate: ({ item }, event) => validate(item)
			validate: ({ item }, event) =>
				fetch(`/items/${item.itemid}.json`, { method: 'post', body: JSON.stringify(item) }).then(
					(r) => r.json()
				)
		},
		delays: {
			// https://lawsofux.com/doherty-threshold/
			// debounce_mutate: 350,
			debounce_validate: 300
		}
	};

	return createMachine(itemDef, itemConfig);
}

//const M = createItemMachine(() => {});
