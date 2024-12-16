'use strict';

const ANIMATION_FRAMES_PER_SECOND = 8;
const FRAME_TIME_INTERVAL = 1 / ANIMATION_FRAMES_PER_SECOND / 60 / 60 / 24;
let LAST_FRAME_TIME_OF_DAY;

class Animator {
	/**
	 * @param {String} layerName The name of the Layer you want to be animated.
	 */
	constructor(layerName) {
		this.layer = thisScene.getLayer(layerName);
		this.defaultScale = this.layer.scale;
		this.effect = this.layer.getEffect(0);
		this.animations = {};

		this.playing = false;
		this.currentAnimationName = '';
		this.currentAnimation = []; // a list of keyframes to play
		this.currentFrame = 0;
		this.loopsNeeded = 0; // how many extra times an animation should play. 0 = plays once.
	}

	/**
	 * Add an array of keyframes to the Animator's list of available Animations
	 * @param {String} animName The name of the new Animation object
	 * @param {Array} keyframes A list of Vec2s for each keyframe in an Animation
	 */
	addAnimation(animName, keyframes) {
		this.animations[animName] = keyframes;
	}

	/**
	 * Configures the Animator to animate a new animation on the next possible frame
	 * @param {String} animName The name of the animation to play
	 * @param {Boolean} flipSprite Flips the sprite to face right instead of left for this animation
	 * @param {Number} loopAmount How many times the animation should loop
	 */
	playAnimation(animName, flipSprite, loopAmount) {
		this.playing = true;
		this.layer.scale = this.defaultScale.multiply( new Vec3(flipSprite ? -1 : 1, 1, 1) );
		this.currentAnimationName = animName;
		this.currentAnimation = this.animations[animName];
		this.currentFrame = -1;
		this.loopsNeeded = loopAmount;
	}

	/**
	 * Stops the current animation
	 */
	stopAnimation() {
		this.playing = false;
		this.currentAnimationName = '';
		this.currentAnimation = [];
		this.currentFrame = -1;
		this.loopsNeeded = 0;
	}

	/**
	 * Advances the current animation by 1 frame
	 * @return {Number} The current frame of animation
	 */
	advanceFrame() {
		this.currentFrame += 1;

		if (this.currentFrame < this.currentAnimation.length) {
			// ADVANCE the animation
			this.effect.setMaterialProperty('spriteoffset', this.currentAnimation[this.currentFrame]);
		} else {
			// LOOP the animation if needed, otherwise STOP
			if (this.loopsNeeded > 0) {
				this.loopsNeeded -= 1;
				this.currentFrame = 0;
				this.effect.setMaterialProperty('spriteoffset', this.currentAnimation[this.currentFrame]);
			} else {
				this.stopAnimation();
			}
		}
		return this.currentFrame;
	}
}

export function init() {
	shared.Animators = {};
	LAST_FRAME_TIME_OF_DAY = engine.timeOfDay;

	let layerNames = [ 'Terra', 'Celes', 'Cyan', 'Edgar' ];

	let animations = {
		wave_down: [ new Vec2(2, 2), new Vec2(3, 2) ],
		wave_up:   [ new Vec2(4, 2), new Vec2(5, 2) ],
		walk_down: [ new Vec2(1, 1), new Vec2(0, 1), new Vec2(2, 1), new Vec2(0, 1) ],
		walk_up:   [ new Vec2(4, 1), new Vec2(3, 1), new Vec2(5, 1), new Vec2(3, 1) ],
		walk_side: [ new Vec2(7, 1), new Vec2(6, 1), new Vec2(8, 1), new Vec2(6, 1) ],
	}

	for (let i = 0; i < layerNames.length; i++) {
		let animator = new Animator(layerNames[i]);
		for (let animName in animations) {
			animator.addAnimation(animName, animations[animName]);
		}
		shared.Animators[layerNames[i]] = animator;
	}
	
	shared.Animators['Terra'].playAnimation('walk_side', false, 20);
}

export function update() {
	const currentTime = engine.timeOfDay;
	if (currentTime - LAST_FRAME_TIME_OF_DAY >= FRAME_TIME_INTERVAL) {

		for (let key in shared.Animators) {
			let animator = shared.Animators[key];

			animator.advanceFrame();
		}

		LAST_FRAME_TIME_OF_DAY = currentTime;
	}
}
