
uniform mat4 g_ModelViewProjectionMatrix;

uniform sampler2D g_Texture1; // {"material":"characterSpritesheet","label":"Spritesheet","hidden":false}
uniform sampler2D g_Texture0; // {"hidden":true}

uniform vec2 u_SpriteSize;
uniform vec2 u_SpriteOffset;

varying vec2 v_TexCoord;

void main() {
	gl_FragColor = texSample2D(g_Texture1, v_TexCoord);
}
