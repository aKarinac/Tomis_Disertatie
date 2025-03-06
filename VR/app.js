import * as THREE from '../libs/three/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from '../libs/three/jsm/XRControllerModelFactory.js';
import { Stats } from '../libs/stats.module.js';
import { OrbitControls } from '../libs/three/jsm/OrbitControls.js';
import { CannonHelper } from '../libs/CannonHelper.js';
import { GLTFLoader } from '../libs/three/jsm/GLTFLoader.js';
// import { EffectComposer } from '../libs/three/jsm/EffectComposer.js';
// import { RenderPass } from '../libs/three/jsm/RenderPass.js';
// import { OutlinePass} from '../libs/three/jsm/OutlinePass.js';
// import { FXAAShader} from '../libs/three/jsm/FXAAShader.js';
// import { ShaderPass } from '../libs/three/jsm/ShaderPass.js';
import { createBazilicaInteriorScene } from './bazilica_Interior.js';



const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);

// Adaugă loguri pentru a verifica dacă sesiunea VR începe și se termină
renderer.xr.addEventListener('sessionstart', () => {
  console.log('Sesiunea VR a început');
});

renderer.xr.addEventListener('sessionend', () => {
  console.log('Sesiunea VR s-a încheiat');
});

// Creează butonul pentru a intra în VR
const vrButton = VRButton.createButton(renderer);

// Setează stiluri CSS pentru a centra butonul
vrButton.style.position = 'absolute';
vrButton.style.top = '50%';
vrButton.style.left = '50%';
vrButton.style.transform = 'translate(-50%, -50%)'; // Centrăm butonul în mijlocul ferestrei

document.body.appendChild(vrButton);


// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 7.5);
scene.add(light);

// Ground plane
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50), // Plane mai mare pentru a simula un câmp
  new THREE.MeshStandardMaterial({ color: 0x228b22 }) // Verde pentru iarbă
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Background albastru (cer)
scene.background = new THREE.Color(0x87ceeb); // Albastru deschis pentru cer

// Load GLB model
const loader = new GLTFLoader();
let model;

loader.load(
  '../models/hartaTomisJoined.glb',
  (gltf) => {
    model = gltf.scene;
    model.name = 'hartaTomisJoined';
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

let criptamodel;
loader.load(
  '../models/BazilicaCrypta.glb',
  (gltf) => {
    criptamodel = gltf.scene;
    criptamodel.name = 'BazilicaCrypta';
    criptamodel.position.set(-1, 1.3, -1.3); 

    criptamodel.scale.set(0.02, 0.02, 0.02);
    scene.add(criptamodel);
    // addOutlineToModel(model);

    criptamodel.traverse((child) => {
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
const controllerGrip = renderer.xr.getControllerGrip(0);
controllerGrip.add(controllerModelFactory.createControllerModel(controllerGrip));
scene.add(controllerGrip);


// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

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
        // wireframe: true, // Activează wireframe pentru contur
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
let selectedModel = null;

// Handle controller interaction
function handleController(controller, raycaster, laser) {
  if (!model || !criptamodel) return;

  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

 // Update laser position and direction
  laser.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), raycaster.ray.direction.clone().multiplyScalar(5)]);
  laser.position.setFromMatrixPosition(controller.matrixWorld);

  const intersects = raycaster.intersectObjects([model, criptamodel], true);

// Dacă există intersecții
  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;
    let parentModel = null;
    intersectedObject.traverseAncestors((ancestor) => {
      if (ancestor === model || ancestor === criptamodel) {
        parentModel = ancestor; // Setează modelul părinte ca fiind modelul tău GLTF
      }
    });

    if (parentModel) {
      // Dacă obiectul intersectat este diferit de cel anterior
      if (selectedModel === null) {
        // Dacă obiectul intersectat este diferit de cel anterior
        if (previousIntersectedObject !== parentModel) {
          // Elimină conturul de pe obiectul anterior, dacă există
          if (previousIntersectedObject) {
            removeOutline(previousIntersectedObject);
          }

          // Adaugă contur pe noul obiect intersectat
          addOutlineToModel(parentModel);

          // Actualizează referința la obiectul intersectat
          previousIntersectedObject = parentModel;
          console.log(`Intersected model: ${parentModel.name || 'Unnamed Model'}`);
        }
      }
    }
  } else {
    // Dacă nu există intersecții și există un obiect intersectat anterior
    if (previousIntersectedObject && selectedModel === null) {
      // Elimină conturul de pe obiectul anterior
      removeOutline(previousIntersectedObject);

      // Resetează referința la obiectul intersectat
      previousIntersectedObject = null;
    }
  }
}

let activeScene = { scene, camera }; // Scena principală

// Add event listeners for select start and end
// controller.addEventListener('selectstart', () => {
//   if (previousIntersectedObject) {
//     // Dacă există un model intersectat, salvează-l ca fiind selectat
//     if (!selectedModel) {

//       selectedModel = previousIntersectedObject;  // Setează modelul ca fiind selectat
//       addOutlineToModel(selectedModel); // Adaugă evidențiere pentru selecție

//       console.log(`Model selectat: ${selectedModel.name || 'Unnamed Model'}`);
//     }
//   }
// });

let isInInteriorScene = false; 

controller.addEventListener('selectstart', () => {
  if (isInInteriorScene) {
    console.log('Deja în scena Bazilica Interior. Teleportarea este dezactivată.');
    return; // Ieșim dacă suntem deja în scena de interior
  }
  if (previousIntersectedObject) {
    if (previousIntersectedObject.name === 'BazilicaCrypta') {
      const { scene: newScene, camera: newCamera} = createBazilicaInteriorScene(renderer, controller, laser, controllerGrip);

      // Comută scena activă
      activeScene = { scene: newScene, camera: newCamera };
      isInInteriorScene = true; 

      console.log('Teleportat la scena interiorului Bazilicii');
    }
  }
});


controller.addEventListener('selectend', () => {
  if (selectedModel) {
    // Elimină evidențierea de pe modelul selectat la eliberarea butonului
    removeOutline(selectedModel);
    selectedModel = null; // Resetează modelul selectat
    console.log('Selecția a fost anulată');
  }
});


// Funcția de animație
renderer.setAnimationLoop(() => {
  handleController(controller, raycaster, laser);
  renderer.render(activeScene.scene, activeScene.camera);  // Randează scena
  // composer.render();
});


// Resize handling
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

