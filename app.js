import * as THREE from '../libs/three/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from '../libs/three/jsm/XRControllerModelFactory.js';
import { Stats } from '../libs/stats.module.js';
import { OrbitControls } from '../libs/three/jsm/OrbitControls.js';
import { CannonHelper } from '../libs/CannonHelper.js';
import { GLTFLoader } from '../libs/three/jsm/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

// Ground plane
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({ color: 0x808080 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Load GLB model
const loader = new GLTFLoader();
let model;
let originalMaterialsMap = new Map();

loader.load(
  'models/cub_collision.glb',
  (gltf) => {
    model = gltf.scene;
    model.position.set(0, 0, -2);
    scene.add(model);
  // Store original materials for highlighting reset
  model.traverse((child) => {
    if (child.isMesh) {
        originalMaterialsMap.set(child, child.material);
    }
  });

},
  undefined,
  (error) => {
    console.error('An error occurred while loading the model:', error);
  }
);

// Set up XR controllers
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);

scene.add(controller1);
scene.add(controller2);

const controllerModelFactory = new XRControllerModelFactory();
const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);

const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
scene.add(controllerGrip2);

// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

// Highlight material
const highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0x0000ff, // Blue
    emissive: 0x0000ff,
    emissiveIntensity: 0.2,
});

// Keep track of intersected meshes
const intersectedMeshes = new Set();

// Create laser for each controller
const laserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const laserGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
const laser1 = new THREE.Line(laserGeometry, laserMaterial);
const laser2 = new THREE.Line(laserGeometry, laserMaterial);

scene.add(laser1);
scene.add(laser2);

// Handle controller interaction
function handleController(controller) {
  if (!model) return;

  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

 // Update laser position and direction
  laser1.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), raycaster.ray.direction.clone().multiplyScalar(5)]);
  laser1.position.setFromMatrixPosition(controller1.matrixWorld);

  laser2.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), raycaster.ray.direction.clone().multiplyScalar(5)]);
  laser2.position.setFromMatrixPosition(controller2.matrixWorld);

  const intersects = raycaster.intersectObject(model, true);

//try 1
// if (intersects.length > 0) {
//     console.log('Controller intersected with model.');
//     if (controller.userData.isSelecting) {
//       console.log('Model selected: MyModel.glb');
//     }
//   }

//try 2
intersectedMeshes.forEach((mesh) => {
    if (!intersects.some((hit) => hit.object === mesh)) {
      console.log('Removing highlight from:', mesh.name || mesh.id);
      console.log('Controller intersected with model.');
      mesh.material = originalMaterialsMap.get(mesh);
      intersectedMeshes.delete(mesh);
    }
  });

  // Apply highlight material to newly intersected meshes
  intersects.forEach((hit) => {
    const mesh = hit.object;
    if (!intersectedMeshes.has(mesh)) {
      intersectedMeshes.add(mesh);
      mesh.material = highlightMaterial;
    }
  });
}


// Add event listeners for select start and end
controller1.addEventListener('selectstart', () => {
  controller1.userData.isSelecting = true;
});

controller1.addEventListener('selectend', () => {
  controller1.userData.isSelecting = false;
});

controller2.addEventListener('selectstart', () => {
  controller2.userData.isSelecting = true;
});

controller2.addEventListener('selectend', () => {
  controller2.userData.isSelecting = false;
});

// Animation loop
renderer.setAnimationLoop(() => {
  handleController(controller1);
  handleController(controller2);
  renderer.render(scene, camera);
});

// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
