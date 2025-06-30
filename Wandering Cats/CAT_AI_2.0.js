"use strict";

let FIRST_UPDATE_PASSED = false;

const TIME_FIX = 24 * 60 * 60;
const ANIMATION_FRAMES_PER_SECOND = 8;
const FRAME_TIME_INTERVAL = 1 / ANIMATION_FRAMES_PER_SECOND;
const MAX_DELTA_TIME = 1/10;

const GRAVITY = -200
const DRAG = -1;

let BASE_Z_INDEX;

const DISTANCE_THRESHHOLD = 12 // radius in which the cat is considered "reached" it"s destination

var COLLISION_BOXES = {}

function randFloat(min, max) {
	return Math.random() * (max - min) + min;
}

function randInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

class Cat {
	constructor(layerName) {
		this.layer = thisScene.getLayer(layerName);
		this.animator = new shared.Animator(this.layer.getChildren()[0]);
		this.waitForAnimationComplete = false;
		this.state = "";
		this.timeSinceLastStateChange = 0;

		this.walkDestination = this.layer.origin;
		this.moveDirection = new Vec3(1, 0, 0);
		this.moveSpeed = 75;

		this.climbSpeed = 75;
		this.climbEndBox = null;

		this.jumpStartBox = null;
		this.jumpVelocity = new Vec3(25, 100, 0);
		this.jumpLandOffset = 20;
		this.jumpFinished = false;

		// setup animations
		this.animator.addAnimation("idle_1",     [new Vec2(0, 0), new Vec2(1, 0), new Vec2(2, 0), new Vec2(3, 0), new Vec2(4, 0), new Vec2(5, 0), new Vec2(6, 0), new Vec2(7, 0)]);
		this.animator.addAnimation("idle_2",     [new Vec2(9, 0), new Vec2(10, 0), new Vec2(11, 0), new Vec2(12, 0), new Vec2(13, 0), new Vec2(14, 0), new Vec2(15, 0), new Vec2(16, 0)]);
		this.animator.addAnimation("walking",    [new Vec2(0, 1), new Vec2(1, 1), new Vec2(2, 1), new Vec2(3, 1), new Vec2(4, 1), new Vec2(5, 1), new Vec2(6, 1), new Vec2(7, 1)]);
		this.animator.addAnimation("running",    [new Vec2(9, 1), new Vec2(10, 1), new Vec2(11, 1), new Vec2(12, 1)]);
		this.animator.addAnimation("wallclimb",  [new Vec2(0, 2), new Vec2(1, 2), new Vec2(2, 2), new Vec2(3, 2), new Vec2(4, 2), new Vec2(5, 2), new Vec2(6, 2), new Vec2(7, 2)]);
		//this.animator.addAnimation("wallidle",   [new Vec2(9, 2), new Vec2(10, 2), new Vec2(11, 2), new Vec2(12, 2), new Vec2(13, 2), new Vec2(14, 2), new Vec2(15, 2), new Vec2(16, 2)]);
		this.animator.addAnimation("ledgeclimb", [new Vec2(0, 3), new Vec2(1, 3), new Vec2(2, 3), new Vec2(3, 3), new Vec2(4, 3), new Vec2(5, 3), new Vec2(6, 3), new Vec2(7, 3), new Vec2(8, 3), new Vec2(9, 3), new Vec2(10, 3)]);
		this.animator.addAnimation("sitting",    [new Vec2(0, 4), new Vec2(1, 4), new Vec2(2, 4), new Vec2(3, 4), new Vec2(4, 4), new Vec2(5, 4), new Vec2(6, 4), new Vec2(7, 4)]);
		this.animator.addAnimation("laying",     [new Vec2(9, 4), new Vec2(10, 4), new Vec2(11, 4), new Vec2(12, 4), new Vec2(13, 4), new Vec2(14, 4), new Vec2(15, 4), new Vec2(16, 4),
												  new Vec2(16, 4), new Vec2(16, 4), new Vec2(16, 4), new Vec2(16, 4), new Vec2(16, 4), new Vec2(16, 4), new Vec2(16, 4)]);
		this.animator.addAnimation("jump_start", [new Vec2(0, 5), new Vec2(1, 5), new Vec2(2, 5), new Vec2(3, 5), new Vec2(5, 5), new Vec2(6, 5)]);
		this.animator.addAnimation("jump_fall",  [new Vec2(7, 5)]);
		this.animator.addAnimation("jump_land",  [new Vec2(9, 5), new Vec2(10, 5)]);
	}

	getOverlappingCollisionBox() {
		for (const box of Object.values(COLLISION_BOXES)) {
			if (box.pointIsInside(this.layer.origin)) {
				return box;
			}
		}
		return null;
	}

	emergencySearchForNearbyCollision() {
		console.log(`WARNING: ${this.layer.name} used Emergency Search!`);
		for (const box of Object.values(COLLISION_BOXES)) {
			// bl, br, tl, tr
			const corners = [
				box.origin,
				box.origin.add(new Vec3(box.size.x, 0, 0)),
				box.origin.add(new Vec3(0, box.size.y, 0)),
				box.origin.add(new Vec3(box.size.x, box.size.y, 0))
			];
			for (let i = 0; i < corners.length; i++) {
				const corner = corners[i];
				const distance = Math.abs(this.layer.origin.subtract(corner).length());
				if (distance <= 20) {
					this.layer.origin = box.origin.add(box.size.divide(2));
					return box;
				}
			}
		}
		return null;
	}

	/**
	 * @return {Vec3} The difference between this cat"s current position and its destination
	 */
	getDifferenceFromWalkDestination() {
		return this.layer.origin.subtract(this.walkDestination);
	}

	/**
	 * @return {Number} The distance between this cat"s current position and its destination
	 */
	getDistanceFromWalkDestination() {
		return Math.abs(this.getDifferenceFromWalkDestination().length());
	}

	walkDestinationReached() {
		return this.getDistanceFromWalkDestination() <= DISTANCE_THRESHHOLD;
	}

	setNewWalkDestination(overrideBox = null) {
		let curCollisionBox = overrideBox || this.getOverlappingCollisionBox();
		if (curCollisionBox === null) return false;

		const tag_Connections = curCollisionBox.tags["Connections"];

		let possibleBoxes = [];
		if (curCollisionBox.walkable) {
			possibleBoxes.push(curCollisionBox);
		}
		if (tag_Connections.attributes[0] !== "") {
			for (const connection of tag_Connections.attributes) {
				let box = COLLISION_BOXES[connection];
				if (box.walkable) {
					possibleBoxes.push(box);
				}
			}
		}

		const selectedBox = possibleBoxes[randInt(0, possibleBoxes.length - 1)];
		this.walkDestination = this.layer.origin;

		// loops until the point is sufficiently far away or it tried too many times
		let tries = 0;
		while (this.getDistanceFromWalkDestination() <= 150 && tries < 100) {
			const x = randFloat(selectedBox.origin.x + selectedBox.innerPadding, selectedBox.origin.x + selectedBox.size.x - selectedBox.innerPadding);
			const y = randFloat(selectedBox.origin.y + selectedBox.innerPadding, selectedBox.origin.y + selectedBox.size.y - selectedBox.innerPadding);
			this.walkDestination = new Vec3(x, y);
			this.moveDirection = this.walkDestination.subtract(this.layer.origin).normalize();
			tries++;
		}

		return true
	}

	decideNextState() {
		const curCollisionBox = this.getOverlappingCollisionBox() || this.emergencySearchForNearbyCollision();
		if (curCollisionBox === null) { console.log(`WARNING: ${this.layer.name} could not decide its next state!`); return; }
		if (curCollisionBox.tags.hasOwnProperty("Climbable")) {
			// START CLIMBING
			this.changeState("climbing")
			return true;
		} else if (curCollisionBox.tags.hasOwnProperty("JumpTo") && randInt(1, 10) === 1) {
			// START JUMPING
			this.changeState("jumping");
			return true;
		}

		const actionRNG = randInt(1, 100);
		if (actionRNG <= 10) {
			// START SITTING
			this.changeState("sitting");
		} else if (actionRNG > 10 && actionRNG <= 20) {
			// START LAYING
			this.changeState("laying");
		} else if (actionRNG > 20 && actionRNG <= 40) {
			// START STANDING
			this.changeState("standing");
		} else if (actionRNG > 40 && actionRNG <= 60) {
			// START RUNNING
			this.changeState("running");
		} else if (actionRNG > 60 && actionRNG <= 100) {
			// START WALKING
			this.changeState("walking");
		}
	}

	/**
	 * Master function for setting up all states
	 * @param {String} newState The name of the state to be changed to
	 */
	changeState(newState, overrideBox = null) {
		this.state = newState;
		this.timeSinceLastStateChange = 0;

		switch(newState) {
			case "walking":
				this.moveSpeed = 75;
				this.setNewWalkDestination(overrideBox);
				this.animator.playAnimation("walking", this.moveDirection.x < 0, -1);
				break;
			case "running":
				this.moveSpeed = 150;
				this.setNewWalkDestination(overrideBox);
				this.animator.playAnimation("running", this.moveDirection.x < 0, -1);
				break;
			case "climbing":
				const curBox = this.getOverlappingCollisionBox();
				const goalBox = COLLISION_BOXES[curBox.layer.name.substring(0, curBox.layer.name.length-1) + "B"];
				this.climbEndBox = goalBox;
				this.walkDestination = new Vec3(this.layer.origin.x, goalBox.origin.y + goalBox.size.y - 20);
				this.moveDirection = new Vec3(0, 1, 0);
				this.animator.playAnimation("wallclimb", curBox.tags["Climbable"].attributes[0] === "right", -1);
				break;
			case "ledgeclimb":
				this.animator.playAnimation("ledgeclimb", this.animator.layer.scale.x < 0, 0);
				break;
			case "jumping":
				this.jumpStartBox = this.getOverlappingCollisionBox();
				this.jumpVelocity = new Vec3(25 * this.animator.layer.scale.x, 100);
				this.jumpLandOffset = randFloat(20, 100);
				this.jumpFinished = false;
				this.animator.playAnimation("jump_start", this.moveDirection.x < 0, 0);
				break;
			case "standing":
				this.animator.playAnimation(`idle_${randInt(1, 2)}`, this.animator.layer.scale.x < 0, randInt(4, 8));
				break;
			case "sitting":
			case "laying":
				this.animator.playAnimation(newState, this.animator.layer.scale.x < 0, randInt(4, 12));
				break;
			default:
				break;
			
		}
	}

	step(deltaTime) {
		switch (this.state) {
			case "walking":
			case "running":
				if (!this.walkDestinationReached()) {
					this.layer.origin = this.layer.origin.add(this.moveDirection.multiply(this.moveSpeed).multiply(deltaTime));
				} else {
					this.decideNextState();
				}
				break;
			case "climbing":
				if (!this.walkDestinationReached()) {
					this.layer.origin = this.layer.origin.add(this.moveDirection.multiply(this.climbSpeed).multiply(deltaTime));
				} else {
					this.changeState("ledgeclimb");
				}
				break;
			case "ledgeclimb":
				if (!this.animator.playing) {
					this.animator.playAnimation("idle_1", this.animator.layer.scale.x < 0, -1);
					this.animator.advanceFrame();
					this.layer.origin = this.layer.origin.add(new Vec3(45 * this.animator.layer.scale.x, 25, 0));
					this.changeState("walking", this.climbEndBox);
				}
				break;
			case "jumping":
				const curCollisionBox = this.getOverlappingCollisionBox();
				if (!this.jumpFinished && curCollisionBox !== null && curCollisionBox.layer.name !== this.jumpStartBox.layer.name && !(curCollisionBox.tags.hasOwnProperty("NoWalk") || curCollisionBox.tags.hasOwnProperty("Climbable")) ) {
					if (this.layer.origin.y < curCollisionBox.origin.y + curCollisionBox.size.y - this.jumpLandOffset) {
						this.animator.playAnimation("jump_land", this.animator.layer.scale.x < 0, 0);
						this.jumpFinished = true;
					}
				}

				if (!this.animator.playing) {
					if (this.jumpFinished) { // checks if the last animation that was playing was "jump_land" and ends the jumping sequence
						this.animator.playAnimation("idle_1", this.animator.layer.scale.x < 0, -1);
						this.animator.advanceFrame();
						this.decideNextState();
						break;
					} else {
						this.animator.playAnimation("jump_fall", this.animator.layer.scale.x < 0, -1);
						this.animator.advanceFrame();
					}
					
				}
				if (!this.jumpFinished) {
					this.jumpVelocity = this.jumpVelocity.add(new Vec3(DRAG * this.animator.layer.scale.x, GRAVITY, 0).multiply(deltaTime));
					if (Math.abs(this.jumpVelocity.x) < 0) this.jumpVelocity.x = 0; // make sure drag can't send the cat backwards
					this.layer.origin = this.layer.origin.add(this.jumpVelocity.multiply(deltaTime));
				}
				break;
			case "standing":
			case "sitting":
			case "laying":
				if (!this.animator.playing) this.decideNextState();
				break;
			case "nop":
				break;
			default:
				this.decideNextState();
				break;
		}
	}
}

var lastTime;
var lastAnimFrameTime = [0, 0, 0, 0, 0];
var cats = [];

export function init() {
	lastTime = engine.timeOfDay * TIME_FIX;
	BASE_Z_INDEX = 100;
	//lastAnimFrameTime.fill(lastTime, 0, -1);

	// cache all collision boxes so they aren"t remade every time a cat needs to decide where they want to go like in the old system
	for (let category of thisScene.getLayer("COLLISION").getChildren()) {
		for (let layer of category.getChildren()) {
			COLLISION_BOXES[layer.name] = new shared.CollisionBox(layer);
		}
	}

	//cats.push(new Cat("CAT_1"));
	for (let i = 1; i < 6; i++) {
		cats.push( new Cat(`CAT_${i}`) );
	}
}

export function update() {
	const currentTime = engine.timeOfDay * TIME_FIX;
	let deltaTime = currentTime - lastTime; if (Math.abs(currentTime - lastTime) > MAX_DELTA_TIME) deltaTime = MAX_DELTA_TIME;

	for (let i = 0; i < cats.length; i++) {
		const cat = cats[i];

		cat.timeSinceLastStateChange += deltaTime;
		if (FIRST_UPDATE_PASSED && cat.timeSinceLastStateChange > 30) {
			console.log(`WARNING: ${cat.layer.name}'s state was stagnant for too long, reset!'`);
			cat.layer.origin = new Vec3(875, 170, 0);
			cat.decideNextState();
		}

		cat.step(deltaTime);
		//thisScene.getLayer("DEBUG_LOCATION").origin = cat.walkDestination;

		try {
			if (currentTime - lastAnimFrameTime[i] >= FRAME_TIME_INTERVAL / cat.animator.animSpeed && cat.animator.currentAnimationName !== "" /*|| cat.animator.currentFrame === -1*/) {
				cat.animator.advanceFrame();
				lastAnimFrameTime[i] = currentTime;
			}
		} catch(err) {}
		
	}
	FIRST_UPDATE_PASSED = true;
	lastTime = currentTime;

	// Z Sorting
	let sortable = [];
	for (let i = 0; i < cats.length; i++) sortable.push(cats[i]);
	sortable.sort(function (a, b) { return Math.floor(b.layer.origin.y) - Math.floor(a.layer.origin.y) });

	for (let i = 0; i < sortable.length; i++) {
		thisScene.sortLayer(sortable[i].animator.layer, i + BASE_Z_INDEX);
	}
}
