import * as THREE from '../libs/three/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from '../libs/three/jsm/XRControllerModelFactory.js';
import { Stats } from '../libs/stats.module.js';
import { OrbitControls } from '../libs/three/jsm/OrbitControls.js';
import { CannonHelper } from '../libs/CannonHelper.js';
import { GLTFLoader } from '../libs/three/jsm/GLTFLoader.js';
import { EffectComposer } from '../libs/three/jsm/EffectComposer.js';
import { RenderPass } from '../libs/three/jsm/RenderPass.js';
import { OutlinePass} from '../libs/three/jsm/OutlinePass.js';
import { FXAAShader} from '../libs/three/jsm/FXAAShader.js';
import { ShaderPass } from '../libs/three/jsm/ShaderPass.js';


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
  'models/hartaTomisJoined.glb',
  (gltf) => {
    model = gltf.scene;
    model.position.set(0, 1.3, -1.3);

    model.scale.set(0.002, 0.002, 0.002);
    scene.add(model);
    // addOutlineToModel(model);

    model.traverse((child) => {
  if (child.isMesh) {
    child.material.needsUpdate = true; // Reconstruiește materialele
  }
});
},
  undefined,
  (error) => {
    console.error('An error occurred while loading the model:', error);
  }
);

// Set up XR controllers
const controller = renderer.xr.getController(0);
// const controller2 = renderer.xr.getController(1);

scene.add(controller);
// scene.add(controller2);

const controllerModelFactory = new XRControllerModelFactory();
const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);


// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();


// let composer, outlinePass;
// let selectedObjects = [];

// // Configurarea composer-ului și a OutlinePass
// function setupOutlinePass() {
//   // Configurează EffectComposer
//   composer = new EffectComposer(renderer);

//   const renderPass = new RenderPass(scene, camera);
//   composer.addPass(renderPass);

//   // Configurează OutlinePass
//   outlinePass = new OutlinePass(
//     new THREE.Vector2(window.innerWidth, window.innerHeight),
//     scene,
//     camera
//   );
//   outlinePass.edgeStrength = 2.5;
//   outlinePass.edgeGlow = 1.0;
//   outlinePass.edgeThickness = 2.0;
//   outlinePass.pulsePeriod = 0; // Static, fără pulsații
//   outlinePass.visibleEdgeColor.set('#ff0000'); // Culoarea conturului
//   outlinePass.hiddenEdgeColor.set('#000000');
//   composer.addPass(outlinePass);

//   // ShaderPass pentru anti-aliasing (opțional)
//   const effectFXAA = new ShaderPass(FXAAShader);
//   effectFXAA.uniforms['resolution'].value.set(
//     1 / window.innerWidth,
//     1 / window.innerHeight
//   );
//   composer.addPass(effectFXAA);
// }

let outlineObject = null;

// Create laser for each controller
const laserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const laserGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
const laser = new THREE.Line(laserGeometry, laserMaterial);
// const laser2 = new THREE.Line(laserGeometry, laserMaterial);

scene.add(laser);
// scene.add(laser2);

function addOutlineToModel(model) {
  model.traverse((child) => {
    if (child.isMesh && !child.userData.isOutline) { // Asigură-te că nu este deja un contur
      // Creează o copie a geometriei pentru contur
      const outlineGeometry = child.geometry.clone();

      // Creează un material pentru contur
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000, // Culoarea conturului
        side: THREE.BackSide, // Renderizează doar partea din spate
        wireframe: true, // Activează wireframe pentru contur
      });

      // Creează un mesh pentru contur
      const outlineMesh = new THREE.Mesh(outlineGeometry, outlineMaterial);

      // Scalează ușor conturul pentru a apărea ca o margine exterioară
      outlineMesh.scale.set(1.05, 1.05, 1.05);

      // Marchează conturul ca fiind special pentru a evita recursivitatea
      outlineMesh.userData.isOutline = true;

      // Atașează conturul ca un copil al mesh-ului original
      child.add(outlineMesh);
    }
  });
}

// Funcție pentru a elimina conturul
function removeOutline(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      // Parcurge toți copiii mesh-ului original
      for (let i = child.children.length - 1; i >= 0; i--) {
        const outlineChild = child.children[i];
        // Verifică dacă este un contur (are userData.isOutline = true)
        if (outlineChild.userData.isOutline) {
          child.remove(outlineChild); // Elimină conturul
          outlineChild.geometry.dispose(); // Eliberează memoria pentru geometrie
          outlineChild.material.dispose(); // Eliberează memoria pentru material
        }
      }
    }
  });
}
let previousIntersectedObject = null;

// Handle controller interaction
function handleController(controller, raycaster, laser) {
  if (!model) return;

  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

 // Update laser position and direction
  laser.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), raycaster.ray.direction.clone().multiplyScalar(5)]);
  laser.position.setFromMatrixPosition(controller.matrixWorld);


  const intersects = raycaster.intersectObject(model, true);

  // Păstrează evidența meshiurilor cu highlight activ
//try 1
// if (intersects.length > 0) {
//     console.log('Controller intersected with model.');
//     if (controller.userData.isSelecting) {
//       console.log('Model selected: MyModel.glb');
//     }
//   }

// Dacă există intersecții
  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;

    // Dacă obiectul intersectat este diferit de cel anterior
    if (previousIntersectedObject !== intersectedObject) {
      // Elimină conturul de pe obiectul anterior, dacă există
      if (previousIntersectedObject) {
        removeOutline(previousIntersectedObject);
      }

      // Adaugă contur pe noul obiect intersectat
      addOutlineToModel(intersectedObject);

      // Actualizează referința la obiectul intersectat
      previousIntersectedObject = intersectedObject;

      console.log(`Intersected model: ${intersectedObject.name || intersectedObject.id}`);
    }
  } else {
    // Dacă nu există intersecții și există un obiect intersectat anterior
    if (previousIntersectedObject) {
      // Elimină conturul de pe obiectul anterior
      removeOutline(previousIntersectedObject);

      // Resetează referința la obiectul intersectat
      previousIntersectedObject = null;
    }
  }
}


// Add event listeners for select start and end
controller.addEventListener('selectstart', () => {
  controller.userData.isSelecting = true;
});

controller.addEventListener('selectend', () => {
  controller.userData.isSelecting = false;
//  console.log(`Removed highlight from mesh ${originalMesh.name || originalMesh.id}`);
});


// Funcția de animație
renderer.setAnimationLoop(() => {
  // Apelează funcția handleController pentru a actualiza intersecțiile
  handleController(controller, raycaster, laser);
  renderer.render(scene, camera);  // Randează scena
  // composer.render();
});


// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  // composer.setSize(window.innerWidth, window.innerHeight);
  // effectFXAA.uniforms["resolution"].value.set(
  //   1 / window.innerWidth,
  //   1 / window.innerHeight
  // );
  
});


// // import * as THREE from '../libs/three/three.module.js';
// // import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/webxr/VRButton.js';
// // import { XRControllerModelFactory } from '../libs/three/jsm/XRControllerModelFactory.js';
// // import { Stats } from '../libs/stats.module.js';
// // import { OrbitControls } from '../libs/three/jsm/OrbitControls.js';
// // import { CannonHelper } from '../libs/CannonHelper.js';
// // import { GLTFLoader } from '../libs/three/jsm/GLTFLoader.js';

// // const scene = new THREE.Scene();
// // const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// // const renderer = new THREE.WebGLRenderer({ antialias: true });
// // renderer.setSize(window.innerWidth, window.innerHeight);
// // renderer.xr.enabled = true;
// // document.body.appendChild(renderer.domElement);
// // document.body.appendChild(VRButton.createButton(renderer));

// // // Lighting
// // const light = new THREE.DirectionalLight(0xffffff, 1);
// // light.position.set(5, 10, 7.5);
// // scene.add(light);

// // // Ground plane
// // const ground = new THREE.Mesh(
// //   new THREE.PlaneGeometry(10, 10),
// //   new THREE.MeshStandardMaterial({ color: 0x808080 })
// // );
// // ground.rotation.x = -Math.PI / 2;
// // scene.add(ground);

// // // Load GLB model
// // const loader = new GLTFLoader();
// // let model;
// // let originalMaterialsMap = new Map();

// loader.load(
//   'models/mapedit3.glb',
//   (gltf) => {
//     model = gltf.scene;
//     model.position.set(0, 1.3, -1.3);

//     model.scale.set(0.002, 0.002, 0.002);
//     scene.add(model);
//     model.traverse((child) => {
//   if (child.isMesh) {
//     child.material.needsUpdate = true; // Reconstruiește materialele
//   }
// });
// },
//   undefined,
//   (error) => {
//     console.error('An error occurred while loading the model:', error);
//   }
// );

// // // Set up XR controllers
// // const controller = renderer.xr.getController(0);
// // // const controller2 = renderer.xr.getController(1);

// // scene.add(controller);
// // // scene.add(controller2);

// // const controllerModelFactory = new XRControllerModelFactory();
// // const controllerGrip1 = renderer.xr.getControllerGrip(0);
// // controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
// // scene.add(controllerGrip1);

// // // const controllerGrip2 = renderer.xr.getControllerGrip(1);
// // // controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
// // // scene.add(controllerGrip2);

// // // Raycaster for interaction
// // const raycaster = new THREE.Raycaster();
// // const tempMatrix = new THREE.Matrix4();

// // const transparentHighlightMaterial = new THREE.MeshStandardMaterial({
// //   color: 0x0000ff, // Blue
// //   transparent: true,
// //   opacity: 0.3, // Semi-transparent
// //   emissive: 0x0000ff,
// //   emissiveIntensity: 0.2
// // });

// // // Keep track of overlay meshes
// // const overlayMeshes = new Map();

// // // Create laser for each controller
// // const laserMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
// // const laserGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
// // const laser = new THREE.Line(laserGeometry, laserMaterial);
// // // const laser2 = new THREE.Line(laserGeometry, laserMaterial);

// // scene.add(laser);
// // // scene.add(laser2);

// // // Păstrează evidența meshiurilor cu highlight activ
// // const highlightedMeshes = new Map();


// // // Handle controller interaction
// // function handleController(controller, raycaster, laser) {
// //   if (!model) return;

// //   tempMatrix.identity().extractRotation(controller.matrixWorld);
// //   raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
// //   raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

// //  // Update laser position and direction
// //   laser.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), raycaster.ray.direction.clone().multiplyScalar(5)]);
// //   laser.position.setFromMatrixPosition(controller.matrixWorld);

// //   const intersects = raycaster.intersectObject(model, true);

// //   // Variabilă pentru a urmări dacă există vreo intersecție
// //   let anyIntersection = false;

// //   // Păstrează evidența meshiurilor cu highlight activ
// // //try 1
// // // if (intersects.length > 0) {
// // //     console.log('Controller intersected with model.');
// // //     if (controller.userData.isSelecting) {
// // //       console.log('Model selected: MyModel.glb');
// // //     }
// // //   }

// // // Adaugă overlay-uri pentru mesh-uri noi intersectate
// // intersects.forEach((hit) => {
// //   const mesh = hit.object;
// //   anyIntersection = true; // Există cel puțin o intersecție

// //   // Dacă mesh-ul nu are deja un overlay
// //   if (highlightedMeshes.has(mesh)) {
// //     console.log(`Mesh ${mesh.name || mesh.id} already highlighted, skipping.`);
// //     return; // Skip this mesh if it already has a highlight
// //   }

// //     // Creează un mesh overlay
// //     const overlay = new THREE.Mesh(mesh.geometry, transparentHighlightMaterial);
// //     overlay.renderOrder = 1; // Asigură-te că overlay-ul se redă deasupra originalului

// //     // Poziționează overlay-ul deasupra mesh-ului original
// //     overlay.position.copy(mesh.position);
// //     overlay.rotation.copy(mesh.rotation);
// //     overlay.scale.copy(mesh.scale);

// //     // Adaugă overlay-ul ca un copil al scenei, nu al mesh-ului original
// //     mesh.add(overlay);

// //     // Salvează overlay-ul pentru a-l elimina ulterior
// //     highlightedMeshes.set(mesh, overlay);
// //     console.log(`Added highlight to mesh ${mesh.name || mesh.id}`);
// // });

// // // Dacă nu mai există intersecție, elimină overlay-ul
// // if (!anyIntersection) {
// //   highlightedMeshes.forEach((overlay, originalMesh) => {
// //     console.log(originalMesh);
// //     originalMesh.remove(overlay); // Elimină overlay
// //     highlightedMeshes.delete(originalMesh);
// //     console.log(`Removed highlight from mesh ${originalMesh.name || originalMesh.id}`);
// //   });
// // }
// // }



// // // Add event listeners for select start and end
// // controller.addEventListener('selectstart', () => {
// //   controller.userData.isSelecting = true;
// //   handleController(controller, raycaster, laser);
// // });

// // controller.addEventListener('selectend', () => {
// //   controller.userData.isSelecting = false;
// //   highlightedMeshes.forEach((overlay, originalMesh) => {
// //     originalMesh.remove(overlay); // Remove the overlay from the mesh
// //     highlightedMeshes.delete(originalMesh);
// //     console.log(`Removed highlight from mesh ${originalMesh.name || originalMesh.id}`);
// //   });
// // });

// // // controller2.addEventListener('selectstart', () => {
// // //   controller2.userData.isSelecting = true;
// // // });

// // // controller2.addEventListener('selectend', () => {
// // //   controller2.userData.isSelecting = false;
// // // });


// // // Animation loop
// // renderer.setAnimationLoop(() => {
// //   // handleController(controller2, raycaster, laser2);
// //   // handleController(controller, raycaster, laser);
// //   renderer.render(scene, camera);
// // });

// // // Resize handling
// // window.addEventListener('resize', () => {
// //   camera.aspect = window.innerWidth / window.innerHeight;
// //   camera.updateProjectionMatrix();
// //   renderer.setSize(window.innerWidth, window.innerHeight);
// // });