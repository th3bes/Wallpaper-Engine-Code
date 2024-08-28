'use strict';

const DISTANCE_THRESHHOLD = 5;
const GRAVITY = -200;
const TIME_FIX = 24 * 60 * 60;
let previousTime = 0;

const NULL_DESTINATION = new Vec3(-10000, -10000)

class CollisionTag {
	constructor(tagLayer) {
		this.name = tagLayer.name;
		this.attributes = tagLayer.text.split(',');
	}
}

class CollisionBox {
	constructor(layer) {
		this.origin = new Vec3(layer.origin);
		this.size = layer.scale;
		this.layer = layer;
		this.tags = this._getCollisionTags()
	}

	// getChildren() cannot be in global scope, so it must be in a function
	_getCollisionTags() {
		let children = this.layer.getChildren();
		for (let i in children) {
			if (children[i].name == 'Tags') {
				let oldTags = children[i].getChildren();
				let newTags = {};
				for (let j in oldTags) {
					newTags[oldTags[j].name] = new CollisionTag(oldTags[j]);
				}
				return newTags;
			}
		}
	}
}

class Cat {
	constructor(newName) {
		this.name = newName;
		this.layer;
		this.state = 'idle';
		this.move_Direction = new Vec3();     // vector pointing towards destination
		this.move_Speed = 0;                  // number multiplied to the moveDirection
		this.destination = NULL_DESTINATION;  // the goal position
		this.previousBox = null;
		this.lastDistanceMagnitude = 0;
		this.timeToNext = 0;
		this.facing = 1;
		this.timeSinceDestinationSet = 0;
	}

	_DEBUG_LOG(message) {
		if (this.layer.name === 'CAT_01') {
			console.log(message);
		}
	}

	changeActiveSprite(override) {
		let spriteName = this.state;
		if (override) spriteName = override;

		let sprites = this.layer.getChildren();
		for (let i in sprites) {
			sprites[i].visible = sprites[i].name == spriteName;
		}
	}

	setSpriteDirection(override) {
		if (this.move_Speed <= 0) return;

		let dir = this.move_Direction.x >= 0 ? 1 : -1
		if (override != null) dir = override;

		this.facing = dir;

		let sprites = this.layer.getChildren();
		for (let i in sprites) {
			sprites[i].scale = new Vec3(dir, 1, 1);
		}
	}

	changeState(newState) {
		this.state = newState;
		getChild(this.layer, 'State').text = newState;
	}

	validateState() {
		let externalState = getChild(this.layer, 'State').text
		if (this.state != externalState) {
			this.state = externalState;
			return false;
		}
		return true;
	}

	getOverlappingCollisionBox() {
		let CATEGORIES = thisScene.getLayer('COLLISION').getChildren();
		for (let i in CATEGORIES) {
			let category = CATEGORIES[i].getChildren()
			for (let j in category) {
				let box = new CollisionBox(category[j]);
				if ((this.layer.origin.x > box.origin.x && this.layer.origin.x < box.origin.x + box.size.x) && (this.layer.origin.y > box.origin.y && this.layer.origin.y < box.origin.y + box.size.y)) {
					return box;
				}
			}
		}
		return null;
	}

	getDifferenceVectorFromDestination() {
		return this.layer.origin.subtract(this.destination);
	}

	setNewDestination(forceNewDestination) {
		// stops if we are not able to walk
		if (this.state == 'climb' || this.state == 'jump') return false;

		// stop searching if we haven't passed the destination
		let currentDistance = Math.abs(this.getDifferenceVectorFromDestination().length());
		if (currentDistance <= this.lastDistanceMagnitude) {
			// stops if we don't need to force a new destination yet
			if (!forceNewDestination && currentDistance > DISTANCE_THRESHHOLD && this.destination != NULL_DESTINATION) {
				return false;
			}
		}

		let collisionBox = this.getOverlappingCollisionBox();
		if (collisionBox == null) collisionBox = this.previousBox;
		this.previousBox = collisionBox;
		let connectionsTag = collisionBox.tags['Connections'];

		let availableBoxes = [];
		if (!collisionBox.tags.hasOwnProperty('NoWalk')) {
			availableBoxes.push(collisionBox);
		}
		for (let i in connectionsTag.attributes) {
			let newLayer = thisScene.getLayer(connectionsTag.attributes[i]);
			if (newLayer) {
				let newBox = new CollisionBox(newLayer);
				if (newBox && newBox.tags && !newBox.tags.hasOwnProperty('NoWalk')) {
					availableBoxes.push(newBox);
				}
			}
		}
		let selectedBox = availableBoxes[randInt(0, availableBoxes.length - 1)];

		this.destination = this.layer.origin;
		let tries = 0;
		while (Math.abs(this.getDifferenceVectorFromDestination().length()) <= DISTANCE_THRESHHOLD) {
			let x = randInt(selectedBox.origin.x + (DISTANCE_THRESHHOLD * 2), selectedBox.origin.x + selectedBox.size.x - (DISTANCE_THRESHHOLD * 2));
			let y = randInt(selectedBox.origin.y + (DISTANCE_THRESHHOLD * 2), selectedBox.origin.y + selectedBox.size.y - (DISTANCE_THRESHHOLD * 2));
			this.destination = new Vec3(x, y);

			let newDiff = this.destination.subtract(this.layer.origin);
			this.move_Direction = newDiff.normalize().multiply(1);

			tries++;
		}
		this.lastDistanceMagnitude = 1000000000;

		this.timeSinceDestinationSet = 0;

		return true;
	}

	climbStart(overlapBox) {
		this.changeState('climb');
		let goalBox = new CollisionBox(thisScene.getLayer(overlapBox.layer.name.substring(0, overlapBox.layer.name.length - 1) + 'B'));
		this.destination = new Vec3(this.layer.origin.x, goalBox.origin.y + goalBox.size.y - 20);
		this.setSpriteDirection(overlapBox.tags.Climbable.attributes == 'left' ? 1 : -1);
		this.move_Direction = new Vec3(0, 1);
	}

	climbEnd() {
		let xAdd = 34 * this.facing; // either 1 or -1
		this.layer.origin = this.layer.origin.add(new Vec3(xAdd, 30));
		this.changeState('walk');
		this.setNewDestination(true);
	}

	jumpStart() {
		this.changeState('jump');
		this.jump_velocity = new Vec2(25 * this.facing, 100);
		this.jump_startTime = engine.timeOfDay * TIME_FIX;
		this.jump_startPos = this.layer.origin;
		this.move_Speed = 0;
	}

	jumpStep(deltaTime) {
		let timeDiff = (engine.timeOfDay * TIME_FIX) - this.jump_startTime;
		// are we landed?
		let overlapBox = this.getOverlappingCollisionBox();
		if (overlapBox && timeDiff > 3 && this.layer.origin.y < this.jump_startPos.y /*this.jump_startPos.y - this.layer.origin.y > 50*/ && this.layer.origin.y < overlapBox.size.y - 15) {
			this.changeState('land');
			this.timeToNext = 0.2;
			return;
		}

		// switch to falling sprite if jump animation is over
		if (timeDiff >= 0.55) {
			this.changeState('freefall');
		} else if (timeDiff >= 0.2) {
			this.changeState('fall');
		}

		let newX = this.layer.origin.x + (this.jump_velocity.x * deltaTime);
		let newY = this.layer.origin.y + (this.jump_velocity.y * deltaTime);
		this.layer.origin = new Vec3(newX, newY);

		this.jump_velocity = this.jump_velocity.add(new Vec2(0, GRAVITY * deltaTime));
	}

}

let CATS = {
	CAT_01: new Cat('CAT_01'),
	CAT_02: new Cat('CAT_02'),
	CAT_03: new Cat('CAT_03'),
	CAT_04: new Cat('CAT_04'),
	CAT_05: new Cat('CAT_05')
}

function randInt(min, max) {
	return Math.max(min, Math.round(Math.random() * max));
}

function getChild(thisLayer, childName) {
	let children = thisLayer.getChildren();
	for (let i in children) {
		if (children[i].name == childName) {
			return children[i];
		}
	}
}

function manageCat(cat, deltaTime) {
	// Refresh the internal state to match the external
	cat.validateState();

	// Tick time remaining on the cat action cooldown
	cat.timeToNext -= deltaTime;

	// if the cat is waiting, don't do anything
	if (cat.timeToNext > 0) return;

	let canProcessLocation = true;
	switch (cat.state) {
		case 'jump':
		case 'fall':
		case 'freefall':
			cat.jumpStep(deltaTime);
		case 'climb':
			canProcessLocation = false;
			break;
		case 'land':
		case 'sit':
		case 'lay':
			cat.changeState('walk');
			break;
	}

	if (canProcessLocation) {
		// Set a new destination
		let reachedDestination = cat.setNewDestination();
		cat.setSpriteDirection();

		if (reachedDestination) {
			let overlapBox = cat.getOverlappingCollisionBox();
			if (overlapBox) {
				if (overlapBox.tags.hasOwnProperty('Climbable')) {
					// climb if current position overlaps a Climbable CollisionBox
					cat.climbStart(overlapBox);
				} else if (cat.state == 'ledgeclimb') {
					// finish climbing
					cat.climbEnd();
				} else if (overlapBox.tags.hasOwnProperty('JumpTo') && randInt(1, 10) == 1) {
					// jump down to lower area
					cat.jumpStart();
				} else if (randInt(1, 15) == 1) {
					// chance to sit upon reaching destination
					cat.changeState('sit');
					if (randInt(1, 4) == 1) {
						cat.changeState('lay');
					}
					cat.timeToNext = randInt(10, 30);
				} else if (randInt(1, 15) == 1) {
					// chance to run instead of walk
					cat.changeState('run');
				} else {
					cat.changeState('walk');
				}
			}
		} else {
			// reset cat if it went wandering
			if (cat.timeSinceDestinationSet > 60) {
				cat.layer.origin = new Vec3(873, 167);
				cat.setNewDestination(true);
			}
		}
	} else if (Math.abs(cat.getDifferenceVectorFromDestination().length()) <= DISTANCE_THRESHHOLD) {
		cat.changeState('ledgeclimb');
		cat.timeToNext = 1.3;
	}

	// Set sprite
	cat.changeActiveSprite();

	switch (cat.state) {
		case 'climb':
		case 'walk':
			cat.timeSinceDestinationSet += deltaTime;
			cat.move_Speed = 75;
			break;
		case 'run':
			cat.move_Speed = 150;
			cat.timeSinceDestinationSet += deltaTime;
			break;
		default:
			cat.move_Speed = 0;
			break;
	}

	cat.lastDistanceMagnitude = Math.abs(cat.getDifferenceVectorFromDestination().length());

	let newPos = cat.move_Direction.multiply(cat.move_Speed).multiply(deltaTime);
	cat.layer.origin = cat.layer.origin.add(newPos);
}

function fixZOrdering(cats) {
	let sortable = [];
	for (let i in cats) {
		sortable.push([cats[i].layer, Math.floor(cats[i].layer.origin.y)]);
	}

	sortable.sort(function (a, b) {
		return b[1] - a[1];
	});

	for (let i = 0; i < sortable.length; i++) {
		let layer = sortable[i][0];
		let baseIndex = (i * 13) + 70;

		thisScene.sortLayer(layer, baseIndex);
		let children = layer.getChildren();
		for (let j = 0; j < children.length; j++) {
			thisScene.sortLayer(children[j], baseIndex + j + 1);
		}
	}
}

export function update() {
	let currentTime = engine.timeOfDay * TIME_FIX;
	// should only return TIME_FIX at midnight
	let diff = Math.min(1, (currentTime + (currentTime < previousTime ? TIME_FIX : 0)) - previousTime);
	previousTime = currentTime;

	for (let i in CATS) {
		manageCat(CATS[i], diff);
	}
	fixZOrdering(CATS);

}

export function init() {
	previousTime = engine.timeOfDay;

	for (let i in CATS) {
		CATS[i].layer = thisScene.getLayer(CATS[i].name);
	}
}
