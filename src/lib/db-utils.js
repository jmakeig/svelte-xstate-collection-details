export class ConstraintViolation extends Error {
	constructor(original) {
		super(original.details);
		this.name = 'ConstraintViolation';
		this.original = original;
	}
}
