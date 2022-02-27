<template>
  <div ref="room">
    <div class="control">
      <button @click="playAudio">play</button>
      <button @click="pauseAudio">pause</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, nextTick, onMounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import AudioVisual from '../../utils/AudioVisual';

const room = ref();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000, 0.002);

const camera = new THREE.PerspectiveCamera(60, 1920 / 1080, 0.1, 1000);
camera.position.set(0, 80, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.toneMappingExposure = Math.pow(0.68, 5.0); // to allow for very bright scenes.
renderer.shadowMap.enabled = true;

function resize() {
  const dom: HTMLElement = room.value;
  camera.aspect = dom.clientWidth / dom.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(dom.clientWidth, dom.clientHeight);
}

onMounted(() => {
  room.value.appendChild(renderer.domElement);
  resize();
})

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

function setLight() {
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  hemiLight.color.setHSL(0.6, 1, 0.6);
  hemiLight.groundColor.setHSL(0.095, 1, 0.75);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);
  const ambientLight = new THREE.AmbientLight(0x222222);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(- 1, 1.75, 1);
  dirLight.position.multiplyScalar(30);
  scene.add(dirLight);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  const d = 50;
  dirLight.shadow.camera.left = - d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = - d;

  dirLight.shadow.camera.far = 3500;
  dirLight.shadow.bias = - 0.0001;
}
setLight();

function setGround() {
  const floorMat = new THREE.MeshStandardMaterial({
    roughness: 0.8,
    color: 0xffffff,
    metalness: 0.2,
    bumpScale: 0.0005
  });
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load('textures/hardwood2_diffuse.jpg', function (map) {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 1;
    map.repeat.set(160, 384);
    map.encoding = THREE.sRGBEncoding;
    floorMat.map = map;
    floorMat.needsUpdate = true;
  });
  textureLoader.load('textures/hardwood2_bump.jpg', function (map) {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 1;
    map.repeat.set(160, 384);
    floorMat.bumpMap = map;
    floorMat.needsUpdate = true;
  });
  textureLoader.load('textures/hardwood2_roughness.jpg', function (map) {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = 1;
    map.repeat.set(160, 384);
    floorMat.roughnessMap = map;
    floorMat.needsUpdate = true;
  });
  const floorGeometry = new THREE.PlaneGeometry(10000, 10000);
  const floorMesh = new THREE.Mesh(floorGeometry, floorMat);
  floorMesh.receiveShadow = true;
  floorMesh.rotation.x = - Math.PI / 2.0;
  scene.add(floorMesh);
}
setGround();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};
animate();

window.onresize = () => {
  resize();
}

const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
function audioShow(data: any) {
  for (let i = 0, len = data.length; i < len; i++) {
    const value: number = data[i];
    let cube: THREE.Mesh | THREE.Object3D | undefined = scene.getObjectByName('cube' + i);
    const geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    if (!cube) {
      cube = new THREE.Mesh(geometry, material);
      cube.name = 'cube' + i;
      cube.position.set(i * 1.5, 0, 0);
      scene.add(cube);
      cube.scale.setY(value / 256 * 50);

      if (cube instanceof THREE.Mesh && cube.material instanceof THREE.MeshBasicMaterial) {
        cube.material.transparent = true;
        cube.material.opacity = 0.5;
      }
    }
    cube.scale.setY(value / 256 * 15);
  }
}

let av: null | AudioVisual = null;
const audio = new Audio('./music/Tobu - Life.mp3');
const playAudio = () => {
  audio.play();
  av = new AudioVisual(audio, { accuracy: 128, waveform: { horizontalAlign: 'center' } }, (data: any) => {
    audioShow(data);
  });
  av.play();
}
const pauseAudio = () => {
  if (av !== null) {
    audio.pause();
    av.pause();
  }
}
</script>

<style scoped lang="scss">
.control {
  position: absolute;
  left: 10px;
  bottom: 10px;
}
</style>
