import * as THREE from "three";
import { scene } from "./scene.js";
import { Simulation } from "./simulation.js";

import "./lights.js";

const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 21;
camera.position.y = -19;
camera.rotateX(0.4);

// @ts-ignore
window.ss = Simulation;
// @ts-ignore
window.cc = camera;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


const ballRadius = Simulation.r;
const ballShape = new THREE.BoxGeometry(2 * ballRadius, 2 * ballRadius, 2 * ballRadius);
const ballColour = new THREE.MeshPhongMaterial({ color: 0xffff00 });
const ball = new THREE.Mesh(ballShape, ballColour);
scene.add(ball);

const planeShape = new THREE.PlaneGeometry(50, 50);
const planeMaterial = new THREE.MeshPhongMaterial({ color: 0x777777, side: THREE.DoubleSide });
const plane = new THREE.Mesh(planeShape, planeMaterial);
plane.position.set(0, 0, 0);
scene.add(plane);

const MAX_POINTS = 1000;
const lineGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(MAX_POINTS * 3);
lineGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

let drawCount = 0;
lineGeometry.setDrawRange(0, drawCount);
const material = new THREE.LineBasicMaterial({ color: 0x0033ff });
const line = new THREE.Line(lineGeometry, material);
scene.add(line);

// Tracer
const addPeriod = 500;
function addPosToTracer(pos: THREE.Vector3) {
	const positions = line.geometry.attributes.position.array;
	positions[drawCount * 3] = pos.x;
	positions[drawCount * 3 + 1] = pos.y;
	positions[drawCount * 3 + 2] = pos.z;
	drawCount++;
	line.geometry.setDrawRange(0, drawCount);
	line.geometry.attributes.position.needsUpdate = true;
}

const ticks = Array(30).fill(0.0166666) as number[];
let time = 0;
function animate(newTime: number) {
	const dt = (newTime - time) / 1000;
	ticks.shift();
	ticks.push(dt);
	Simulation.tick(dt);
	const realPos = Simulation.x.value.clone().add(new THREE.Vector3(0, 0, Simulation.r));
	ball.position.copy(realPos);
	ball.setRotationFromAxisAngle(Simulation.a.value.clone().normalize(), Simulation.a.value.length());
	plane.setRotationFromAxisAngle(new THREE.Vector3(0, 0, 1), Simulation.A.value.z);
	if (Math.floor(newTime / addPeriod) !== Math.floor(time / addPeriod)) addPosToTracer(realPos);
	renderer.render(scene, camera);
	(document.getElementById("fps-text") as HTMLDivElement).innerText =
		`fps: ${(30 / ticks.reduce((a, b) => a + b)).toFixed(2)}`;
	time = newTime;
}

renderer.setAnimationLoop(animate);