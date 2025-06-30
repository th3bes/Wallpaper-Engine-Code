'use strict';

class Animator {
	/**
	 * @param {String} layerName The name of the Layer you want to be animated.
	 */
	constructor(layerName) {
		this.layer = thisScene.getLayer(layerName);
		this.effect = this.layer.getEffect(0);
		this.animations = {};

		this.playing = false;
		this.currentAnimationName = '';
		this.currentAnimation = []; // a list of keyframes to play
		this.currentFrame = -1;
		this.framesPassed = 0; // used to check if an Animator can move yet
		this.loopsNeeded = 0; // how many extra times an animation should play. 0 = plays once.
		this.animSpeed = 1;
	}

	/**
	 * Add an array of Vec2 keyframes to the Animator's list of available Animations, a duplicate name will override the old animation data
	 * @param {String} animName The name of the new Animation object
	 * @param {Array} keyframes A list of Vec2s for each keyframe in an Animation
	 */
	addAnimation(animName, keyframes) {
		this.animations[animName] = keyframes;
	}

	/**
	 * Configures the Animator to start a new animation on the next possible frame
	 * @param {String} animName The name of the animation to play
	 * @param {Boolean} flipSprite Flips the sprite to face right instead of left for this animation
	 * @param {Number} loopAmount How many times the animation should loop. -1 Loops until manually stopped or another Animation is played
	 */
	playAnimation(animName, flipSprite = false, loopAmount = 0) {
		this.playing = true;
		this.currentAnimationName = animName;
		this.currentAnimation = this.animations[animName];
		this.currentFrame = -1;
		this.framesPassed = 0;
		this.loopsNeeded = loopAmount;
		this.layer.scale = new Vec3( Math.abs(this.layer.scale.x), this.layer.scale.y, this.layer.scale.z ).multiply( new Vec3(flipSprite ? -1 : 1, 1, 1) );
	}

	/**
	 * Stops the current animation
	 */
	stopAnimation() {
		this.playing = false;
		this.currentAnimationName = '';
		this.currentAnimation = [];
		this.currentFrame = -1;
		this.framesPassed = 0;
		this.loopsNeeded = 0;
	}

	/**
	 * Advances the current animation by 1 frame, loops if necessary, and stops if the animation is ended.
	 * @return {Number} The current frame of animation
	 */
	advanceFrame() {
		this.currentFrame += 1;
		this.framesPassed += 1;
		//console.log(this.layer.name, this.spritesheetIndex, this.currentAnimationName, '(', this.currentAnimation, ')');

		if (this.currentFrame < (this.currentAnimation !== undefined ? this.currentAnimation.length : 0) ) {
			// ADVANCE the animation
			this.effect.setMaterialProperty('spriteoffset', this.currentAnimation[this.currentFrame]);
		} else {
			// LOOP the animation if needed, otherwise STOP
			// setting loopsNeeded to -1 will result in the animation looping forever. this is INTENTIONAL
			if (this.loopsNeeded != 0) {
				this.loopsNeeded--;
				this.currentFrame = 0;
				this.effect.setMaterialProperty('spriteoffset', this.currentAnimation[this.currentFrame]);
			} else {
				this.stopAnimation();
			}
		}
		return this.currentFrame;
	}
}

shared.Animator = Animator;
