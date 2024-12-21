// snowVertex.glsl
varying vec2 vUv;
varying float vAlpha;
uniform float uTime;
attribute float aScale;
attribute float aRandomness;
attribute vec3 aVelocity;

void main() {
    vUv = uv;

    // Position
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Rotating motion
    float angle = uTime * aRandomness;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));

    // Add some wobble
    float wobble = sin(uTime * 2.0 + aRandomness * 10.0) * 0.2;
    modelPosition.x += wobble * aRandomness;

    // Add wind effect
    float windStrength = sin(uTime * 0.5) * 0.5 + 0.5;
    modelPosition.x += windStrength * aVelocity.x;
    modelPosition.z += windStrength * aVelocity.z;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Point size variation
    float scale = aScale * (2.0 + sin(uTime + aRandomness * 10.0) * 0.5);
    gl_PointSize = scale * (300.0 / -viewPosition.z);

    // Fade out based on distance and height
    float heightFade = 1.0 - clamp(abs(modelPosition.y - 20.0) / 50.0, 0.0, 1.0);
    float distanceFade = 1.0 - clamp(length(viewPosition.xyz) / 100.0, 0.0, 1.0);
    vAlpha = heightFade * distanceFade * 0.8;
}
