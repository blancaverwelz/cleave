precision highp float;

uniform sampler2D uOriginal;
uniform sampler2D uResult;
uniform sampler2D uNoise;
uniform float uProgress;   // 0 -> 1 over the dissolve duration
uniform vec3 uAccentColor; // edge glow tint
uniform float uEdgeWidth;  // width of the glow band, in noise-value units

varying vec2 vUv;

void main() {
  float n = texture2D(uNoise, vUv * 1.0).r;

  // Pixels whose noise value is below uProgress have "dissolved" and show
  // the cutout result; the rest still show the original image.
  float dissolved = step(n, uProgress);

  vec4 original = texture2D(uOriginal, vUv);
  vec4 result = texture2D(uResult, vUv);

  // Composite result over original using the cutout's own alpha, so
  // transparent regions of the cutout reveal the (checker/void) backdrop
  // rather than the original photo underneath.
  vec4 revealed = mix(original, result, result.a);
  vec4 base = mix(original, revealed, dissolved);

  // Edge glow: a thin band around the current dissolve front, brightest
  // right at the boundary and falling off on either side.
  float dist = abs(n - uProgress);
  float edge = 1.0 - smoothstep(0.0, uEdgeWidth, dist);
  vec3 glow = uAccentColor * edge * 1.4;

  vec3 color = base.rgb + glow;
  float alpha = max(base.a, edge * 0.85);

  gl_FragColor = vec4(color, alpha);
}
