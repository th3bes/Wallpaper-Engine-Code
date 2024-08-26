// used to dim layers with certain effects for nighttime/rain visuals

'use strict';

let enableTimeOverride = false;
let timeOverride = 12;
let weatherIndex = 0;

let validLayers = [];

let Dawn = {
	Time: {
		Start: 6 - 0.45,
		Mid: 6 + 0.2,
		End: 6 + 1.25,
	},
};
let Sunset = {
	Time: {
		Start: 19.5 - 0.45,
		Mid: 19.5 + 0.0,
		End: 19.5 + 0.45,
	},
};

export function update() {
	for (let i = 0; i < validLayers.length; i++) {
		let curLayer = thisScene.getLayer(validLayers[i].name);
		if (!curLayer.visible) continue;

		let effectCount = curLayer.getEffectCount();
		for (let j = 0; j < effectCount; j++) {
			let curEffect = curLayer.getEffect(j);

			if (curEffect.name.includes('NIGHT_')) {
				if (weatherIndex > 4) {
					curEffect.setMaterialProperty('Opacity', 1);
					continue;
				}
				// an effect that gets applied throughout the day
				const time = enableTimeOverride ? timeOverride : engine.timeOfDay * 24;

				let newOpacity = 1;
				if (time >= Dawn.Time.Start && time < Dawn.Time.End) {
					newOpacity = 1 - calculateOpacity(time, Dawn.Time.Start, Dawn.Time.End);
				} else if (time >= Dawn.Time.End && time < Sunset.Time.Start) {
					newOpacity = 0;
				} else if (time >= Sunset.Time.Start && time < Sunset.Time.End) {
					newOpacity = calculateOpacity(time, Sunset.Time.Start, Sunset.Time.End);
				}

				curEffect.setMaterialProperty('Opacity', newOpacity);
			}
		}
	}
	return;

	function calculateOpacity(time, start, end) {
		return (time - start) / (end - start);
	}
}

export function init() {
	thisLayer.visible = false;
	// compile an array of all of the actual layers we want to loop through in 'update'
	let testLayers = thisScene.enumerateLayers();
	for (let i = 0; i < testLayers.length; i++) {
		try {
			let curLayer = thisScene.getLayer(testLayers[i].name);
			let effectCount = curLayer.getEffectCount();

			for (let j = 0; j < effectCount; j++) {
				let curEffect = curLayer.getEffect(j);

				if (curEffect.name.includes('NIGHT_')) {
					validLayers.push(curLayer);
					break;
				}
			}
		} catch {
			continue;
		}
	}
}

function applyWeatherEffects() {
	let rainLayers = ['Rain Sky', 'Long Rain Clouds'];
	for (let i = 0; i < rainLayers.length; i++) {
		thisScene.getLayer(rainLayers[i]).visible = weatherIndex >= 5;
	}

	let stormLayers = ['Lightning'];
	for (let i = 0; i < stormLayers.length; i++) {
		thisScene.getLayer(stormLayers[i]).visible = weatherIndex == 6;
	}

	let clearLayers = ['Sky', 'Galaxy', 'Stars', 'Sun', 'Moon', 'Shooting star', 'Clouds', 'Critters'];
	for (let i = 0; i < clearLayers.length; i++) {
		thisScene.getLayer(clearLayers[i]).visible = weatherIndex < 5;
	}
}

export function applyUserProperties(properties) {
	if (properties.hasOwnProperty('enabletimeoverride')) {
		enableTimeOverride = properties.enabletimeoverride;
	}
	if (properties.hasOwnProperty('timeoverride')) {
		timeOverride = properties.timeoverride;
	}
	if (properties.hasOwnProperty('sunrisestart')) {
		Dawn.Time.Start = properties.sunrisestart - 0.45;
		Dawn.Time.Mid = properties.sunrisestart + 0.2;
		Dawn.Time.End = properties.sunrisestart + 1.25;
	}
	if (properties.hasOwnProperty('duskstart')) {
		Sunset.Time.Start = properties.duskstart - 1.25;
		Sunset.Time.Mid = properties.duskstart + 0.2;
		Sunset.Time.End = properties.duskstart + 0.45;
	}
	if (properties.hasOwnProperty('currentweather')) {
		weatherIndex = properties.currentweather;
		applyWeatherEffects();
	}
}
