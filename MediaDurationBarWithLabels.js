'use strict';

const TIME_FIX = 24 * 60 * 60;
let songPosition = 0, maxDuration, durMode = 0, songStartTime, startTime, playbackState;

function getDisplayTime(number) {
	let hours = Math.floor(number / 60 / 60);
	let minutes = Math.floor(number / 60);
	let seconds = Math.floor(number % 60);

	let outStr = '';
	if (hours > 0) outStr += hours + ':';
	return outStr + minutes + ':' + seconds.toString().padStart(2, '0');
}

let durationModeFunctions = [
	function (duration) {
		return getDisplayTime(duration);
	},
	function (duration, position) {
		return '-' + getDisplayTime(Math.max(0, duration - position));
	}
];

export function update() {
	if (playbackState !== MediaPlaybackEvent.PLAYBACK_PLAYING || !songPosition || !startTime) return;

	let positionToUse = songPosition;
	let timeDifference = (engine.timeOfDay * TIME_FIX) - startTime;

	let progressString;
	let durationString;
	if (Math.abs(timeDifference - songPosition) <= 10) {
		// use estimated time
		positionToUse = timeDifference / maxDuration;

		progressString = getDisplayTime(timeDifference);
		durationString = durationModeFunctions[durMode](maxDuration, timeDifference);
	} else {
		// resync time
		startTime = (engine.timeOfDay * TIME_FIX) - songPosition;
		positionToUse = songPosition / maxDuration;

		progressString = getDisplayTime(songPosition);
		durationString = durationModeFunctions[durMode](maxDuration, songPosition);
	}

	thisScene.getLayer('TimeRemaining').text = progressString;
	thisScene.getLayer('TimeRemainingBloom').text = progressString;

	thisScene.getLayer('SongLength').text = durationString;
	thisScene.getLayer('SongLengthBloom').text = durationString;

	let finalPos = positionToUse <= 1 ? positionToUse : 1
	//thisScene.getLayer('DurationEndBar').origin = new Vec3((1 - finalPos) * -101, 0, 0);
	return new Vec3(positionToUse <= 1 ? finalPos : 1, 1, 1);
}

export function init() {
	startTime = engine.timeOfDay * TIME_FIX;
	playbackState = MediaPlaybackEvent.PLAYBACK_STOPPED;
}

export function mediaTimelineChanged(event) {
	songPosition = event.position;
	maxDuration = event.duration;
}

export function mediaPropertiesChanged(event) {
	songStartTime = engine.timeOfDay * TIME_FIX;
	startTime = songStartTime;
}

export function mediaPlaybackChanged(event) {
	playbackState = event.state;
}

export function applyUserProperties(properties) {
	if (properties.hasOwnProperty('durationmode')) {
		durMode = parseInt(properties.durationmode);
	}
}
