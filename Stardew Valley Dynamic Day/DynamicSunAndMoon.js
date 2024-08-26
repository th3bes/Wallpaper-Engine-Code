// the resolution this code was written for is 640x360 (16:9), so if your project has a different resolution then make sure to scale up xMaxResolution and yDefaultOffset accordingly

'use strict';

const xMaxResolution = 640;
const yDefaultOffset = 120;

let enableTimeOverride = false;
let timeOverride = 12;
let xIntercepts = new Vec2(6, 19.5);
let horizonOceanOffset = 0;

function generateParabola(xIntercepts, vertexY) {
	let vertexX = (xIntercepts.x + xIntercepts.y) / 2;
	vertexY -= horizonOceanOffset

	let h = vertexX;
	let k = vertexY;
	let a = -vertexY / Math.pow(h - xIntercepts.x, 2);

	function parabola(x) {
		return a * Math.pow(x - h, 2) + k;
	}

	return parabola;
}

const yOffset = 160;
let parabolaYInfo = generateParabola(xIntercepts, yOffset)

export function update() {
	const time = enableTimeOverride ? timeOverride : engine.timeOfDay * 24;
	const moonTime = (time + 12) % 24;

	thisScene.getLayer('Sun').origin = new Vec3(xMaxResolution * (time / 24), parabolaYInfo(time) + yDefaultOffset + horizonOceanOffset, 1);
	thisScene.getLayer('Moon').origin = new Vec3(xMaxResolution * (moonTime / 24), parabolaYInfo(moonTime) + yDefaultOffset + horizonOceanOffset, 1);
}

export function applyUserProperties(properties) {
	if (properties.hasOwnProperty('sunrisestart')) {
		xIntercepts = new Vec2(properties.sunrisestart, xIntercepts.y);
		parabolaYInfo = generateParabola(xIntercepts, yOffset);
	}
	if (properties.hasOwnProperty('duskstart')) {
		xIntercepts = new Vec2(xIntercepts.x, properties.duskstart);
		parabolaYInfo = generateParabola(xIntercepts, yOffset);
	}
	if (properties.hasOwnProperty('horizonoceanoffset')) {
		horizonOceanOffset = properties.horizonoceanoffset;
		parabolaYInfo = generateParabola(xIntercepts, yOffset);
	}
	if (properties.hasOwnProperty('enabletimeoverride')) {
		enableTimeOverride = properties.enabletimeoverride;
	}
	if (properties.hasOwnProperty('timeoverride')) {
		timeOverride = properties.timeoverride;
	}
}
