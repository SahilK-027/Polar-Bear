import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import particlesVertexShader from "./shaders/particles/vertex.glsl";
import particlesFragmentShader from "./shaders/particles/fragment.glsl";
import gpgpuParticlesFragmentShader from "./shaders/gpgpu/particles-frag.glsl";
import music from "./audio/bg.mp3";

import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GroundedSkybox } from "three/addons/objects/GroundedSkybox.js";
import snowVertexShader from "./shaders/snow/vertex.glsl";
import snowFragmentShader from "./shaders/snow/fragment.glsl";
import GUI from "lil-gui";

const isMobile = window.matchMedia("(max-width: 768px)").matches;

// Canvas
const canvas = document.querySelector("canvas.webgl");

const models = [
  {
    name: "Polar Bear",
    modelLink: "./polar_bear.glb",
    camera: {
      x: isMobile ? -70 : -10,
      y: isMobile ? 50 : 30,
      z: 70 + (isMobile ? 25 : 0),
    },
    clearColor: "#041615",
    rotation: {
      x: 0,
      y: 0 + (isMobile ? -0.4 : 0),
      z: 0,
    },
    uSize: 0.4,
    credits: `https://skfb.ly/6WOIU`,
    music: music,
    musicCredits:
      "https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=6195",
    musicCreator: "freesound_community",
  },
];

const LoadingPage = document.getElementById("loader");
const progressBar = document.querySelector(".loading-progress");
const percentage = document.querySelector(".loading-percentage");
const enterButton = document.getElementById("enter-button");
enterButton.addEventListener("click", () => {
  playMusic();
  loadExperience();
});

const loadExperience = () => {
  LoadingPage.style.display = "none";
  canvas.style.display = "block";
};

const loadingManager = new THREE.LoadingManager(
  // Loaded
  () => {
    // Wait a little
    window.setTimeout(() => {
      enterButton.style.display = "block";
    }, 500);
  },

  // Progress
  (itemUrl, itemsLoaded, itemsTotal) => {
    console.log(itemUrl);
    // Calculate the progress and update the loadingBarElement
    const progressRatio = (itemsLoaded / itemsTotal) * 300;
    progressBar.style.width = `${progressRatio}px`;
    percentage.innerHTML = Math.round(progressRatio / 3.0) + " %";
  }
);

// Generate a new model index different from the previous one
let modelIndex = 0;
document.getElementById("curr-model-name").innerText = models[modelIndex].name;
document.getElementById("credits-anchor").href = models[modelIndex].credits;
document.getElementById("music-credits-anchor").innerText =
  models[modelIndex].musicCreator;
document.getElementById("music-credits-anchor").href =
  models[modelIndex].musicCredits;

const model = models[modelIndex];

// Scene
const scene = new THREE.Scene();

// Loaders
const textureLoader = new THREE.TextureLoader(loadingManager);

const dracoLoader = new DRACOLoader(loadingManager);
dracoLoader.setDecoderPath("/draco/");

const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setDRACOLoader(dracoLoader);

const rgbeLoader = new RGBELoader(loadingManager);
rgbeLoader.load("https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/snowy_hillside_2k.hdr", (environmentMap) => {
  environmentMap.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = environmentMap;

  const skybox = new GroundedSkybox(environmentMap, 15, 70);
  skybox.position.y = 7;
  scene.add(skybox);
});

scene.environmentIntensity = 0.0001;

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  sizes.pixelRatio = Math.min(window.devicePixelRatio, 2);

  // Materials
  particles.material.uniforms.uResolution.value.set(
    sizes.width * sizes.pixelRatio,
    sizes.height * sizes.pixelRatio
  );

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(sizes.pixelRatio);
});

// Camera
const camera = new THREE.PerspectiveCamera(
  35,
  sizes.width / sizes.height,
  0.01,
  1000
);
camera.position.set(model.camera.x, model.camera.y, model.camera.z);
scene.add(camera);

// Create an audio listener and add it to the camera (or scene)
const audioListener = new THREE.AudioListener();
camera.add(audioListener); // Make sure the listener is attached to the camera

// Create a global audio source
const bgSound = new THREE.Audio(audioListener);
scene.add(bgSound);

// Load the audio file using the AudioLoader
const audioLoader = new THREE.AudioLoader(loadingManager);
audioLoader.load(models[modelIndex].music, (buffer) => {
  // Set the audio buffer
  bgSound.setBuffer(buffer);
  bgSound.setLoop(true); // Optional: Make it loop
  bgSound.setVolume(0.5); // Set volume
});

// Ensure AudioContext is resumed on user interaction (required by browsers)
const ctx = new (window.AudioContext || window.webkitAudioContext)(); // Add fallback for Safari

const playMusic = () => {
  // Resume the audio context (required by most browsers for autoplay audio)
  ctx.resume().then(() => {
    if (!bgSound.isPlaying) {
      bgSound.play();
    }
  });
};

// Controls
const controls = new OrbitControls(camera, canvas);
controls.minPolarAngle = Math.PI / 5;
controls.maxPolarAngle = isMobile ? Math.PI / 2.7 : Math.PI / 2.3;
controls.enableDamping = true;
controls.enablePan = false;
controls.enableZoom = false;

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);

// Load model
const gltf = await gltfLoader.loadAsync(model.modelLink);

// Base Geometry
const baseGeometry = {};
baseGeometry.instance = gltf.scene.children[0].geometry;
baseGeometry.count = baseGeometry.instance.attributes.position.count;

// GPGPU
const gpgpu = {};
gpgpu.size = Math.ceil(Math.sqrt(baseGeometry.count));
gpgpu.computation = new GPUComputationRenderer(
  gpgpu.size,
  gpgpu.size,
  renderer
);

// Base Particle Data
const baseParticlesTexture = gpgpu.computation.createTexture();
for (let i = 0; i < baseGeometry.count; i++) {
  const i3 = i * 3;
  const i4 = i * 4;

  baseParticlesTexture.image.data[i4 + 0] =
    baseGeometry.instance.attributes.position.array[i3 + 0];
  baseParticlesTexture.image.data[i4 + 1] =
    baseGeometry.instance.attributes.position.array[i3 + 1];
  baseParticlesTexture.image.data[i4 + 2] =
    baseGeometry.instance.attributes.position.array[i3 + 2];
  baseParticlesTexture.image.data[i4 + 3] = Math.random();
}

// Particles Data
gpgpu.particlesVariable = gpgpu.computation.addVariable(
  "uParticles",
  gpgpuParticlesFragmentShader,
  baseParticlesTexture
);
gpgpu.computation.setVariableDependencies(gpgpu.particlesVariable, [
  gpgpu.particlesVariable,
]);

// Uniforms
gpgpu.particlesVariable.material.uniforms.uTime = new THREE.Uniform(0);
gpgpu.particlesVariable.material.uniforms.uDeltaTime = new THREE.Uniform(0);
gpgpu.particlesVariable.material.uniforms.uBase = new THREE.Uniform(
  baseParticlesTexture
);
gpgpu.particlesVariable.material.uniforms.Influence = new THREE.Uniform(
  model.Influence ? model.Influence : 0.2
);
gpgpu.particlesVariable.material.uniforms.Strength = new THREE.Uniform(
  model.Strength ? model.Strength : 4.0
);
gpgpu.particlesVariable.material.uniforms.Frequency = new THREE.Uniform(
  model.Frequency ? model.Frequency : 0.5
);

// Init
gpgpu.computation.init();

// Particles
const particles = {};
// Geometry
const particlesUvArray = new Float32Array(baseGeometry.count * 2);
const sizesArray = new Float32Array(baseGeometry.count);

for (let y = 0; y < gpgpu.size; y++) {
  for (let x = 0; x < gpgpu.size; x++) {
    const i = y * gpgpu.size + x;
    const i2 = i * 2;

    const uvX = (x + 0.5) / gpgpu.size;
    const uvY = (y + 0.5) / gpgpu.size;

    particlesUvArray[i2 + 0] = uvX;
    particlesUvArray[i2 + 1] = uvY;

    sizesArray[i] = Math.random();
  }
}

// Main Particle Geometry
particles.geometry = new THREE.BufferGeometry();
particles.geometry.setDrawRange(0, baseGeometry.count);
particles.geometry.setAttribute(
  "aParticlesUv",
  new THREE.BufferAttribute(particlesUvArray, 2)
);
particles.geometry.setAttribute(
  "aColor",
  baseGeometry.instance.attributes.color
);
particles.geometry.setAttribute(
  "aSize",
  new THREE.BufferAttribute(sizesArray, 1)
);

// Main Particle Material
particles.material = new THREE.ShaderMaterial({
  vertexShader: particlesVertexShader,
  fragmentShader: particlesFragmentShader,
  uniforms: {
    uSize: new THREE.Uniform(model.uSize),
    uResolution: new THREE.Uniform(
      new THREE.Vector2(
        sizes.width * sizes.pixelRatio,
        sizes.height * sizes.pixelRatio
      )
    ),
    uParticlesTexture: new THREE.Uniform(),
  },
});

// Main Particle Points
particles.points = new THREE.Points(particles.geometry, particles.material);
particles.points.rotateZ(model.rotation.z);
particles.points.rotateX(model.rotation.x);
particles.points.rotateY(model.rotation.y);
scene.add(particles.points);

// Snow Particles System
// Create circular snow texture programmatically
const snowCanvas = document.createElement("canvas");
snowCanvas.width = 32;
snowCanvas.height = 32;
const context = snowCanvas.getContext("2d");

const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

context.fillStyle = gradient;
context.fillRect(0, 0, 32, 32);

const snowTexture = new THREE.CanvasTexture(snowCanvas);

// Snow system parameters
const snowCount = 20000; // Increased particle count
const maxRange = 300;
const minRange = maxRange / 2;
const minHeight = 30;

// Create arrays for attributes
const positions = new Float32Array(snowCount * 3);
const scales = new Float32Array(snowCount);
const randomness = new Float32Array(snowCount);
const velocities = new Float32Array(snowCount * 3);

// Fill arrays with initial values
for (let i = 0; i < snowCount; i++) {
  const i3 = i * 3;

  // Position
  positions[i3] = (Math.random() - 0.5) * maxRange;
  positions[i3 + 1] = Math.random() * minRange + minHeight;
  positions[i3 + 2] = (Math.random() - 0.5) * maxRange;

  // Scale
  scales[i] = Math.random() * 2;

  // Randomness for rotation and movement
  randomness[i] = Math.random();

  // Velocity
  velocities[i3] = (Math.random() - 0.5) * 0.2;
  velocities[i3 + 1] = -(Math.random() * 0.5 + 0.5) * 0.2;
  velocities[i3 + 2] = (Math.random() - 0.5) * 0.2;
}

// Create geometry and add attributes
const snowGeometry = new THREE.BufferGeometry();
snowGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
snowGeometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));
snowGeometry.setAttribute(
  "aRandomness",
  new THREE.BufferAttribute(randomness, 1)
);
snowGeometry.setAttribute(
  "aVelocity",
  new THREE.BufferAttribute(velocities, 3)
);

// Create shader material
const snowMaterial = new THREE.ShaderMaterial({
  vertexShader: snowVertexShader,
  fragmentShader: snowFragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uSnowTexture: { value: snowTexture },
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

// Create points
const snow = new THREE.Points(snowGeometry, snowMaterial);
scene.add(snow);

// Update function
const updateSnow = () => {
  const positions = snow.geometry.attributes.position.array;
  const velocities = snow.geometry.attributes.aVelocity.array;

  for (let i = 0; i < snowCount * 3; i += 3) {
    positions[i] += velocities[i];
    positions[i + 1] += velocities[i + 1];
    positions[i + 2] += velocities[i + 2];

    // Reset particle if it falls below ground
    if (positions[i + 1] < 0) {
      positions[i] = (Math.random() - 0.5) * maxRange;
      positions[i + 1] = minHeight + Math.random() * minRange;
      positions[i + 2] = (Math.random() - 0.5) * maxRange;
    }
  }

  snow.geometry.attributes.position.needsUpdate = true;

  // Update time uniform
  snow.material.uniforms.uTime.value = clock.getElapsedTime();
};

// GUI Setup
const gui = new GUI();
// Snow Controls
const snowFolder = gui.addFolder("Snow Controls");
const snowParams = {
  snowSpeed: 0.2,
  particleSize: 1.0,
};

snowFolder
  .add(snowParams, "snowSpeed", 0.05, 1.0)
  .name("Speed")
  .onChange((value) => {
    for (let i = 0; i < snowCount * 3; i += 3) {
      velocities[i + 1] = -value; // Adjust Y velocity for snow speed
    }
  });

snowFolder
  .add(snowParams, "particleSize", 0.1, 5.0)
  .name("Size")
  .onChange((value) => {
    for (let i = 0; i < scales.length; i++) {
      scales[i] = value; // Adjust particle scale
    }
    snow.geometry.attributes.aScale.needsUpdate = true;
  });

// Music Controls
const musicFolder = gui.addFolder("Music Controls");
const musicParams = {
  volume: 0.5,
  togglePlay: () => {
    if (bgSound.isPlaying) {
      bgSound.pause();
    } else {
      bgSound.play();
    }
  },
};

musicFolder
  .add(musicParams, "volume", 0, 1)
  .name("Volume")
  .onChange((value) => {
    bgSound.setVolume(value);
  });

musicFolder.add(musicParams, "togglePlay").name("Play/Pause");

// Particles Controls
const particlesFolder = gui.addFolder("Particle Controls");
const particlesParams = {
  size: model.uSize,
};

particlesFolder
  .add(particlesParams, "size", 0.1, 2.0)
  .name("Particle Size")
  .onChange((value) => {
    particles.material.uniforms.uSize.value = value;
  });

const gpgpuFolder = gui.addFolder("GPGPU Uniforms");
gpgpuFolder
  .add(gpgpu.particlesVariable.material.uniforms.Influence, "value", 0, 1, 0.01)
  .name("Influence");
gpgpuFolder
  .add(gpgpu.particlesVariable.material.uniforms.Strength, "value", 0, 10, 0.1)
  .name("Strength");
gpgpuFolder
  .add(gpgpu.particlesVariable.material.uniforms.Frequency, "value", 0, 5, 0.1)
  .name("Frequency");

if (isMobile) {
  gui.close();
}
// Animation Loop
const clock = new THREE.Clock();
let previousTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - previousTime;
  previousTime = elapsedTime;

  updateSnow();

  // Update controls
  controls.update();

  // Update GPGPU
  gpgpu.particlesVariable.material.uniforms.uTime.value = elapsedTime;
  gpgpu.particlesVariable.material.uniforms.uDeltaTime.value = deltaTime;
  gpgpu.computation.compute();
  particles.material.uniforms.uParticlesTexture.value =
    gpgpu.computation.getCurrentRenderTarget(gpgpu.particlesVariable).texture;

  // Render normal scene
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
