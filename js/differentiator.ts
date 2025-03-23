import { Vector3 } from "three";

function toExpr(expr: Expr | number) {
	return expr instanceof Expr ? expr : new Constant(expr);
}

function toExpr3(expr: Expr3 | Vector3) {
	if (expr instanceof Vector3) return new Constant3(expr);
	return expr;
}

abstract class Expr {
	tiedExpressions = [] as (Expr | Expr3)[];
	needsUpdate = true;
	storedValue = 0;
	abstract _eval(): number
	abstract dt(c?: number): Expr

	eval() {
		if (this.needsUpdate) {
			this.needsUpdate = false;
			return this.storedValue = this._eval();
		}
		return this.storedValue;
	}

	dispatchUpdate() {
		if (this.needsUpdate) return;
		this.needsUpdate = true;
		for (const c of this.tiedExpressions) {
			c.dispatchUpdate();
		}
	}

	add(expr: Expr | number) {
		return Add(this, expr);
	}
	sub(expr: Expr | number) {
		return Sub(this, expr);
	}
	mul(expr: Expr | number) {
		return Mul(this, expr);
	}
	div(expr: Expr | number) {
		return Div(this, expr);
	}
	pow(num: number) {
		return Pow(this, num);
	}
}

abstract class Expr3 {
	tiedExpressions = [] as (Expr | Expr3)[];
	needsUpdate = true;
	storedValue = new Vector3();
	abstract _eval(): Vector3
	abstract dt(c?: number): Expr3

	eval() {
		if (this.needsUpdate) {
			this.needsUpdate = false;
			return this.storedValue = this._eval();
		}
		return this.storedValue.clone();
	}

	dispatchUpdate() {
		if (this.needsUpdate) return;
		this.needsUpdate = true;
		for (const c of this.tiedExpressions) {
			c.dispatchUpdate();
		}
	}

	add3(expr: Expr3 | Vector3) {
		return Add3(this, expr);
	}
	sub3(expr: Expr3 | Vector3) {
		return Sub3(this, expr);
	}
	mul3(expr: Expr | number) {
		return Mul3(this, expr);
	}
	dot(expr: Expr3 | Vector3) {
		return Dot(this, expr);
	}
	cross(expr: Expr3 | Vector3) {
		return Cross(this, expr);
	}
}

export class Constant extends Expr {
	value;
	constructor(value: number) {
		super();
		this.value = value;
	}

	_eval() { return this.value; }

	dt() { return new Constant(0); }

	get opCount() { return 1; }
}

export class Constant3 extends Expr3 {
	value;
	constructor(value: Vector3) {
		super();
		this.value = value;
	}

	_eval() { return this.value.clone(); }

	dt() { return new Constant3(new Vector3()); }

	get opCount() { return 1; }
}

export class Var extends Expr {
	_value = 0;
	_dt: Expr[] = [];
	constructor(value: number) {
		super();
		this._value = value;
	}

	get value() { return this._value; }

	set value(x: number) {
		this._value = x;
		this.dispatchUpdate();
	}

	setDt(dt: Expr, c = 0) {
		this._dt[c] = dt;
	}

	_eval() {
		return this.value;
	}

	dt(c = 0) {
		return this._dt[c] || new Constant(0);
	}

	get opCount() { return 1; }
}

export class Var3 extends Expr3 {
	_value = new Vector3();
	_dt: Expr3[] = [];
	constructor(value: Vector3) {
		super();
		this._value = value;
	}

	get value() { return this._value; }

	set value(x: Vector3) {
		this._value = x;
		this.dispatchUpdate();
	}

	setDt(dt: Expr3, c = 0) {
		this._dt[c] = dt;
	}

	_eval() {
		return this.value.clone();
	}

	dt(c = 0) {
		return this._dt[c] || new Constant3(new Vector3());
	}

	get opCount() { return 1; }
}

class ExprNeg extends Expr {
	expr1;
	constructor(expr1: Expr | number) {
		super();
		this.expr1 = toExpr(expr1);
		this.expr1.tiedExpressions.push(this);
	}

	_eval() {
		return -this.expr1.eval();
	}

	dt(c = 0) {
		return Neg(this.expr1.dt(c));
	}
}

class ExprNeg3 extends Expr3 {
	expr1;
	constructor(expr1: Expr3 | Vector3) {
		super();
		this.expr1 = toExpr3(expr1);
		this.expr1.tiedExpressions.push(this);
	}

	_eval() {
		return this.expr1.eval().clone().negate();
	}

	dt(c = 0) {
		return Neg3(this.expr1.dt(c));
	}
}

class ExprAdd extends Expr {
	expr1;
	expr2;
	constructor(expr1: Expr | number, expr2: Expr | number) {
		super();
		this.expr1 = toExpr(expr1);
		this.expr2 = toExpr(expr2);
		this.expr1.tiedExpressions.push(this);
		this.expr2.tiedExpressions.push(this);
	}

	_eval() {
		return this.expr1.eval() + this.expr2.eval();
	}

	dt(c = 0): Expr {
		if (this.expr1 instanceof Constant) return this.expr2.dt(c);
		if (this.expr2 instanceof Constant) return this.expr1.dt(c);
		return Add(this.expr1.dt(c), this.expr2.dt(c));
	}
}

class ExprAdd3 extends Expr3 {
	expr1;
	expr2;
	constructor(expr1: Expr3 | Vector3, expr2: Expr3 | Vector3) {
		super();
		this.expr1 = toExpr3(expr1);
		this.expr2 = toExpr3(expr2);
		this.expr1.tiedExpressions.push(this);
		this.expr2.tiedExpressions.push(this);
	}

	_eval() {
		return this.expr1.eval().clone().add(this.expr2.eval());
	}

	dt(c = 0): Expr3 {
		if (this.expr1 instanceof Constant3) return this.expr2.dt(c);
		if (this.expr2 instanceof Constant3) return this.expr1.dt(c);
		return Add3(this.expr1.dt(c), this.expr2.dt(c));
	}
}

class ExprSub extends Expr {
	expr1;
	expr2;
	constructor(expr1: Expr | number, expr2: Expr | number) {
		super();
		this.expr1 = toExpr(expr1);
		this.expr2 = toExpr(expr2);
		this.expr1.tiedExpressions.push(this);
		this.expr2.tiedExpressions.push(this);
	}

	_eval() {
		return this.expr1.eval() - this.expr2.eval();
	}

	dt(c = 0): Expr {
		if (this.expr1 instanceof Constant) return Neg(this.expr2.dt(c));
		if (this.expr2 instanceof Constant) return this.expr1.dt(c);
		return Sub(this.expr1.dt(c), this.expr2.dt(c));
	}
}

class ExprSub3 extends Expr3 {
	expr1;
	expr2;
	constructor(expr1: Expr3 | Vector3, expr2: Expr3 | Vector3) {
		super();
		this.expr1 = toExpr3(expr1);
		this.expr2 = toExpr3(expr2);
		this.expr1.tiedExpressions.push(this);
		this.expr2.tiedExpressions.push(this);
	}

	_eval() {
		return this.expr1.eval().clone().sub(this.expr2.eval());
	}

	dt(c = 0): Expr3 {
		if (this.expr1 instanceof Constant3) return Neg3(this.expr2.dt(c));
		if (this.expr2 instanceof Constant3) return this.expr1.dt(c);
		return Sub3(this.expr1.dt(c), this.expr2.dt(c));
	}
}

class ExprMul extends Expr {
	expr1;
	expr2;
	constructor(expr1: Expr | number, expr2: Expr | number) {
		super();
		this.expr1 = toExpr(expr1);
		this.expr2 = toExpr(expr2);
		this.expr1.tiedExpressions.push(this);
		this.expr2.tiedExpressions.push(this);
	}

	_eval() {
		return this.expr1.eval() * this.expr2.eval();
	}

	dt(c = 0): Expr {
		if (this.expr1 instanceof Constant) return Mul(this.expr2.dt(c), this.expr1);
		if (this.expr2 instanceof Constant) return Mul(this.expr1.dt(c), this.expr2);
		return Add(Mul(this.expr1.dt(c), this.expr2), Mul(this.expr1, this.expr2.dt(c)));
	}
}

class ExprMul3 extends Expr3 {
	expr1;
	expr2;
	constructor(expr1: Expr3 | Vector3, expr2: Expr | number) {
		super();
		this.expr1 = toExpr3(expr1);
		this.expr2 = toExpr(expr2);
		this.expr1.tiedExpressions.push(this);
		this.expr2.tiedExpressions.push(this);
	}

	_eval() {
		return this.expr1.eval().clone().multiplyScalar(this.expr2.eval());
	}

	dt(c = 0): Expr3 {
		if (this.expr1 instanceof Constant3) return Mul3(this.expr1, this.expr2.dt(c));
		if (this.expr2 instanceof Constant) return Mul3(this.expr1.dt(c), this.expr2);
		return Add3(Mul3(this.expr1.dt(c), this.expr2), Mul3(this.expr1, this.expr2.dt(c)));
	}
}

class ExprDiv extends Expr {
	expr1;
	expr2;
	constructor(expr1: Expr | number, expr2: Expr | number) {
		super();
		this.expr1 = toExpr(expr1);
		this.expr2 = toExpr(expr2);
		this.expr1.tiedExpressions.push(this);
		this.expr2.tiedExpressions.push(this);
	}

	_eval() {
		return this.expr1.eval() / this.expr2.eval();
	}

	dt(c = 0): Expr {
		return Sub(Div(this.expr1.dt(c), this.expr2), Mul(Mul(this.expr1, this.expr2.dt(c)), Pow(this.expr2, -2)));
	}
}

class ExprPow extends Expr {
	expr1;
	num;
	constructor(expr1: Expr | number, num: number) {
		super();
		this.expr1 = toExpr(expr1);
		this.num = num;
		this.expr1.tiedExpressions.push(this);
	}

	_eval() {
		return Math.pow(this.expr1.eval(), this.num);
	}

	dt(c = 0): Expr {
		return Mul(Mul(this.num, Pow(this.expr1, this.num - 1)), this.expr1.dt(c));
	}
}

class ExprSin extends Expr {
	expr;
	amplitude;
	constructor(expr: Expr, am = 1) {
		super();
		this.expr = toExpr(expr);
		this.amplitude = am;
		this.expr.tiedExpressions.push(this);
	}

	_eval() {
		return this.amplitude * Math.sin(this.expr.eval());
	}

	dt(c = 0): Expr {
		return Mul(this.amplitude, Mul(Cos(this.expr), this.expr.dt(c)));
	}
}

class ExprCos extends Expr {
	expr;
	amplitude;
	constructor(expr: Expr, am = 1) {
		super();
		this.expr = toExpr(expr);
		this.amplitude = am;
		this.expr.tiedExpressions.push(this);
	}

	_eval() {
		return this.amplitude * Math.cos(this.expr.eval());
	}

	dt(c = 0): Expr {
		return Mul(this.amplitude, Mul(Neg(Sin(this.expr)), this.expr.dt(c)));
	}
}

class ExprDot extends Expr {
	expr1;
	expr2;
	constructor(expr1: Expr3 | Vector3, expr2: Expr3 | Vector3) {
		super();
		this.expr1 = toExpr3(expr1);
		this.expr2 = toExpr3(expr2);
		this.expr1.tiedExpressions.push(this);
		this.expr2.tiedExpressions.push(this);
	}

	_eval() {
		return this.expr1.eval().clone().dot(this.expr2.eval());
	}

	dt(c = 0): Expr {
		if (this.expr1 instanceof Constant3) return Dot(this.expr1, this.expr2.dt(c));
		if (this.expr2 instanceof Constant) return Dot(this.expr1.dt(c), this.expr2);
		return Add(Dot(this.expr1.dt(c), this.expr2), Dot(this.expr1, this.expr2.dt(c)));
	}
}

class ExprCross extends Expr3 {
	expr1;
	expr2;
	constructor(expr1: Expr3 | Vector3, expr2: Expr3 | Vector3) {
		super();
		this.expr1 = toExpr3(expr1);
		this.expr2 = toExpr3(expr2);
		this.expr1.tiedExpressions.push(this);
		this.expr2.tiedExpressions.push(this);
	}

	_eval() {
		return this.expr1.eval().clone().cross(this.expr2.eval());
	}

	dt(c = 0): Expr3 {
		if (this.expr1 instanceof Constant3) return Cross(this.expr1, this.expr2.dt(c));
		if (this.expr2 instanceof Constant3) return Cross(this.expr1.dt(c), this.expr2);
		return Add3(Cross(this.expr1.dt(c), this.expr2), Cross(this.expr1, this.expr2.dt(c)));
	}
}

export function Neg(expr1: Expr | number) { return new ExprNeg(expr1); }
export function Add(expr1: Expr | number, expr2: Expr | number) { return new ExprAdd(expr1, expr2); }
export function Sub(expr1: Expr | number, expr2: Expr | number) { return new ExprSub(expr1, expr2); }
export function Mul(expr1: Expr | number, expr2: Expr | number) { return new ExprMul(expr1, expr2); }
export function Div(expr1: Expr | number, expr2: Expr | number) { return new ExprDiv(expr1, expr2); }
export function Pow(expr1: Expr | number, num: number) { return new ExprPow(expr1, num); }
export function Sin(expr: Expr, num = 1) { return new ExprSin(expr, num); }
export function Cos(expr: Expr, num = 1) { return new ExprCos(expr, num); }

export function Neg3(expr1: Expr3 | Vector3) { return new ExprNeg3(expr1); }
export function Add3(expr1: Expr3 | Vector3, expr2: Expr3 | Vector3) { return new ExprAdd3(expr1, expr2); }
export function Sub3(expr1: Expr3 | Vector3, expr2: Expr3 | Vector3) { return new ExprSub3(expr1, expr2); }
export function Mul3(expr1: Expr3 | Vector3, expr2: Expr | number) { return new ExprMul3(expr1, expr2); }
export function Dot(expr1: Expr3 | Vector3, expr2: Expr3 | Vector3) { return new ExprDot(expr1, expr2); }
export function Cross(expr1: Expr3 | Vector3, expr2: Expr3 | Vector3) { return new ExprCross(expr1, expr2); }