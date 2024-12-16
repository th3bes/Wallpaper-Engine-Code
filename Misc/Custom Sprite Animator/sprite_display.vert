
uniform mat4 g_ModelViewProjectionMatrix;

uniform vec2 u_SpriteSize; // {"material":"spritebounds", "label":"Sprite Size", "linked":false, "int": true, "default":"26 28"}
uniform vec2 u_SpriteOffset; // {"material":"spriteoffset", "label":"Sprite Offset", "linked":false,"int": true, "default":"0 0"}

uniform vec4 g_Texture1Resolution;

attribute vec3 a_Position;
attribute vec2 a_TexCoord;

varying vec2 v_TexCoord;

void main() {
	vec2 size = vec2( u_SpriteSize.x / g_Texture1Resolution.x, u_SpriteSize.y / g_Texture1Resolution.y );
	vec2 offset = vec2( (u_SpriteOffset.x * u_SpriteSize.x) / g_Texture1Resolution.x, (u_SpriteOffset.y * u_SpriteSize.y) / g_Texture1Resolution.y );

	v_TexCoord = a_TexCoord * size + offset;
	gl_Position = mul(vec4(a_Position, 1.0), g_ModelViewProjectionMatrix);
}
