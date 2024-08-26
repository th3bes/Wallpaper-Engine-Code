// the layer that an individual Critter is linked to is a particle system

'use strict';

let SEASONAL_OVERRIDE = false;
let CURRENT_SEASON = 'spring';
const timeFix = 24 * 60 * 60;
let previousTime = 0;

let CRITTERS = {
	Butterfly: {
		Layer_Name: 'Butterfly',
		Enabled: true,
		Season: ['spring'],
		Variants: 4,
		Min_Time: 25,
		Max_Time: 60,
		Time_Until_Next: 0,
		Queue_Delay: 0.1,
		Queue_Wait: 0,
		Queue_Amount: 0,
		Min_Amount: 3,
		Max_Amount: 12,
	},
	LargeBird: {
		Layer_Name: 'LargeBird',
		Enabled: true,
		Season: ['spring', 'summer'],
		Variants: 2,
		Min_Time: 45,
		Max_Time: 95,
		Time_Until_Next: 0,
		Queue_Delay: 0.1,
		Queue_Wait: 0,
		Queue_Amount: 0,
		Min_Amount: 1,
		Max_Amount: 6,
	},
	SmallBird: {
		Layer_Name: 'SmallBird',
		Enabled: true,
		Season: ['spring', 'summer', 'fall'],
		Variants: 4,
		Min_Time: 25,
		Max_Time: 95,
		Time_Until_Next: 0,
		Queue_Delay: 0.1,
		Queue_Wait: 0,
		Queue_Amount: 0,
		Min_Amount: 1,
		Max_Amount: 4,
	},
	Squirrel: {
		Layer_Name: 'Squirrel',
		Enabled: true,
		Season: ['spring', 'summer', 'fall'],
		Variants: 1,
		Min_Time: 45,
		Max_Time: 105,
		Time_Until_Next: 0,
		Queue_Delay: 0.2,
		Queue_Wait: 0,
		Queue_Amount: 0,
		Min_Amount: 1,
		Max_Amount: 3,
	},
	GrayBunny: {
		Layer_Name: 'GrayBunny',
		Enabled: true,
		Season: ['spring', 'fall'],
		Variants: 1,
		Min_Time: 65,
		Max_Time: 125,
		Time_Until_Next: 0,
		Queue_Delay: 0.4,
		Queue_Wait: 0,
		Queue_Amount: 0,
		Min_Amount: 1,
		Max_Amount: 3,
	},
	SnowBunny: {
		Layer_Name: 'SnowBunny',
		Enabled: true,
		Season: ['winter'],
		Variants: 1,
		Min_Time: 75,
		Max_Time: 135,
		Time_Until_Next: 0,
		Queue_Delay: 0.4,
		Queue_Wait: 0,
		Queue_Amount: 0,
		Min_Amount: 1,
		Max_Amount: 3,
	},
}

/////////////////////////////////////////////////////////////

function randInt(min, max) {
	return Math.floor(Math.random() * max) + min;
}

function critterIsValid(curCritter) {
	return (!SEASONAL_OVERRIDE && curCritter.Season.includes(CURRENT_SEASON)) || (SEASONAL_OVERRIDE && curCritter.Enabled);
}

export function init() {
	previousTime = engine.timeOfDay * timeFix;

	for (let key in CRITTERS) {
		if (CRITTERS.hasOwnProperty(key)) {
			CRITTERS[key].Time_Until_Next = randInt(CRITTERS[key].Min_Time, CRITTERS[key].Max_Time);
			CRITTERS[key].Queue_Amount = randInt(CRITTERS[key].Min_Amount, CRITTERS[key].Max_Amount);
			CRITTERS[key].Queue_Wait = CRITTERS[key].Queue_Delay;
		}
	}
}

export function update() {
	let currentTime = engine.timeOfDay * timeFix;
	//                        should only return timeFix at midnight (not sure if this is necessary but whatever)
	let diff = (currentTime + (currentTime < previousTime ? timeFix : 0)) - previousTime;
	previousTime = currentTime;

	for (let key in CRITTERS) {
		if (CRITTERS.hasOwnProperty(key)) {
			let curCritter = CRITTERS[key];

			if (!critterIsValid(curCritter)) {
				continue;
			}

			curCritter.Time_Until_Next -= diff;

			if (curCritter.Time_Until_Next <= 0 && curCritter.Queue_Amount > 0) {
				curCritter.Queue_Wait -= diff;
				if (curCritter.Queue_Wait <= 0) {
					let variant = randInt(1, curCritter.Variants);
					thisScene.getLayer(curCritter.Layer_Name + variant).emitParticles(1);
					curCritter.Queue_Wait = curCritter.Queue_Delay;
					curCritter.Queue_Amount--;
				}

				if (curCritter.Queue_Amount <= 0) {
					curCritter.Time_Until_Next = randInt(curCritter.Min_Time, curCritter.Max_Time);
					curCritter.Queue_Amount = randInt(curCritter.Min_Amount, curCritter.Max_Amount);
				}
			}
		}
	}
}

export function applyUserProperties(properties) {
	if (properties.hasOwnProperty('guhhh')) { // Season property but it has a dumb ID :(
		CURRENT_SEASON = ['spring', 'summer', 'fall', 'winter'][properties.guhhh - 1];
	}
	if (properties.hasOwnProperty('seasonalcritteroverride')) {
		SEASONAL_OVERRIDE = properties.seasonalcritteroverride
	}
	if (properties.hasOwnProperty('butterfliesenabled')) {
		CRITTERS.Butterfly.Enabled = properties.butterfliesenabled;
	}
	if (properties.hasOwnProperty('largebirdsbluepurple')) {
		CRITTERS.LargeBird.Enabled = properties.largebirdsbluepurple;
	}
	if (properties.hasOwnProperty('smallbirdsenabled')) {
		CRITTERS.SmallBird.Enabled = properties.smallbirdsenabled;
	}
	if (properties.hasOwnProperty('squirrelsenabled')) {
		CRITTERS.Squirrel.Enabled = properties.squirrelsenabled;
	}
	if (properties.hasOwnProperty('graybunnyenabled')) {
		CRITTERS.GrayBunny.Enabled = properties.graybunnyenabled;
	}
	if (properties.hasOwnProperty('snowbunnyenabled')) {
		CRITTERS.SnowBunny.Enabled = properties.snowbunnyenabled;
	}
}
