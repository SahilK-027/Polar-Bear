// snowFragment.glsl
varying vec2 vUv;
varying float vAlpha;
uniform sampler2D uSnowTexture;

void main() {
    // Radial gradient for soft particles
    float strength = 1.0 - length(gl_PointCoord - vec2(0.5));
    strength = pow(strength, 2.0);

    // Sample texture
    vec4 snowColor = texture2D(uSnowTexture, gl_PointCoord);

    // Final color
    vec3 color = vec3(0.9, 0.95, 1.0); // Slightly blue-tinted white
    gl_FragColor = vec4(color, snowColor.a * strength * vAlpha);
}