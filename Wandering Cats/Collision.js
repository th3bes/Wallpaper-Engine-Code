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
		this.innerPadding = 1;
		this.layer = layer;
		this.tags = this._getCollisionTags();
		this.walkable = this.tags.hasOwnProperty('NoWalk') === false;
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

	/**
	 * Checks if a given point is inside the bounds of the collision box
	 * @param {Vec3} point
	 * @return {Boolean}
	 */
	pointIsInside(point) {
		return (point.x > this.origin.x && point.x < this.origin.x + this.size.x) && (point.y > this.origin.y && point.y < this.origin.y + this.size.y);
	}
}

shared.CollisionBox = CollisionBox;
