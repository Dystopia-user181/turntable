import { Vector3 } from "three";

import { Var3, Cross, Add3, Mul3, Sub3 } from "./differentiator";

const m = 2, r = 2, I = 2 / 3 * m * r * r, Id = 5;

const frictionDr = new Vector3(0, 0, -r);
const x = new Var3(new Vector3(0, 3, 0)),
	v = new Var3(new Vector3(-3.2, 0, 0)),
	W = new Var3(new Vector3(0, 0, 3)),
	A = new Var3(new Vector3(0, 0, 0)),
	w = new Var3(new Vector3(0, 0, 0)),
	a = new Var3(new Vector3(0, 0, 0));

const frictionMultiplier = 300;
const friction = Mul3(Sub3(Cross(W, x), Add3(v, Cross(w, frictionDr))), frictionMultiplier);

x.setDt(v);
v.setDt(Mul3(friction, 1 / m));
w.setDt(Mul3(Cross(frictionDr, friction), 1 / I));
W.setDt(Mul3(Cross(x, friction), -1 / Id));

const dvExpr = v.dt(), d2vExpr = dvExpr.dt(), d3vExpr = d2vExpr.dt();
const dwExpr = w.dt(), d2wExpr = dwExpr.dt(), d3wExpr = d2wExpr.dt();
const dWExpr = W.dt(), d2WExpr = dWExpr.dt(), d3WExpr = d2WExpr.dt();

export const Simulation = {
	m, r, I, Id,
	x, v, W, w, A, a,
	_tick(dt: number) {
		const dv = dvExpr.eval().clone(), d2v = d2vExpr.eval().clone(), d3v = d3vExpr.eval().clone();
		const dw = dwExpr.eval().clone(), d2w = d2wExpr.eval().clone(), d3w = d3wExpr.eval().clone();
		const dW = dWExpr.eval().clone(), d2W = d2WExpr.eval().clone(), d3W = d3WExpr.eval().clone();
		const dt2 = dt * dt, dt3 = dt2 * dt;
		dv.multiplyScalar(dt);
		dw.multiplyScalar(dt);
		dW.multiplyScalar(dt);
		d2v.multiplyScalar(dt2);
		d2w.multiplyScalar(dt2);
		d2W.multiplyScalar(dt2);
		d3v.multiplyScalar(dt3);
		d3w.multiplyScalar(dt3);
		d3W.multiplyScalar(dt3);
		x.value.add(v.value.clone().add(dv.clone().multiplyScalar(1 / 2))
			.add(d2v.clone().multiplyScalar(1 / 6))
			.add(d3v.clone().multiplyScalar(1 / 24))
			.multiplyScalar(dt));
		a.value.add(w.value.clone().add(dw.clone().multiplyScalar(1 / 2))
			.add(d2w.clone().multiplyScalar(1 / 6))
			.add(d3w.clone().multiplyScalar(1 / 24))
			.multiplyScalar(dt));
		A.value.add(W.value.clone().add(dW.clone().multiplyScalar(1 / 2))
			.add(d2W.clone().multiplyScalar(1 / 6))
			.add(d3W.clone().multiplyScalar(1 / 24))
			.multiplyScalar(dt));
		v.value.add(dv.clone()
			.add(d2v.clone().multiplyScalar(1 / 2))
			.add(d3v.clone().multiplyScalar(1 / 6)));
		w.value.add(dw.clone()
			.add(d2w.clone().multiplyScalar(1 / 2))
			.add(d3w.clone().multiplyScalar(1 / 6)));
		W.value.add(dW.clone()
			.add(d2W.clone().multiplyScalar(1 / 2))
			.add(d3W.clone().multiplyScalar(1 / 6)));
	},
	tick(_dt: number) {
		const dt = Math.min(_dt, 0.2);
		const n = Math.ceil(dt * 10000);
		for (let i = 0; i < n; i++) this._tick(dt / n);
	}
};