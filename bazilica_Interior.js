import * as THREE from '../libs/three/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.154.0/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from '../libs/three/jsm/GLTFLoader.js';


export function createBazilicaInteriorScene(renderer,controller,laser, controllerGrip) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  // Configurare VR
  renderer.xr.enabled = true;
  document.body.appendChild(VRButton.createButton(renderer));

  // Lumini pentru interior
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  const pointLight = new THREE.PointLight(0xffffff, 1);
  pointLight.position.set(0, 5, 0);

  scene.add(ambientLight);
  scene.add(pointLight);
  scene.background = new THREE.Color(0x87ceeb); // Albastru deschis pentru cer


// Încarcă modelul BazilicaCrypta.glb
const loader = new GLTFLoader();
loader.load(
  'models/BazilicaCrypta.glb',
  (gltf) => {
    const model = gltf.scene;

    model.scale.set(0.1, 0.1, 0.1); // Ajustează scara, dacă este necesar
    model.position.set(-0.95, 1.6, 0); // Plasează modelul la origine
    scene.add(model);

    console.log('Modelul BazilicaCrypta a fost încărcat ca scenă de interior.');
  },
  undefined,
  (error) => {
    console.error('Eroare la încărcarea modelului BazilicaCrypta:', error);
  }
);
  // Adaugă controller-ul și laserul în scena de interior
  scene.add(controller);
  scene.add(laser);
  scene.add(controllerGrip); // Modelul controller-ului
  
// buton EXIT
const exitButtonGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.05);
const exitButtonMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const exitButton = new THREE.Mesh(exitButtonGeometry, exitButtonMaterial);
exitButton.position.set(-0.8, 2, 1);
exitButton.name = 'ExitButton';  // Numele este important pentru a-l recunoaște

scene.add(exitButton);


// Raycaster for interaction
const raycaster = new THREE.Raycaster();
const tempMatrix = new THREE.Matrix4();

function handleController(controller, raycaster, laser) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  
    // Actualizează poziția și direcția laserului
    laser.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), raycaster.ray.direction.clone().multiplyScalar(5)]);
    laser.position.setFromMatrixPosition(controller.matrixWorld);
  
    // Verifică intersecțiile în scena activă
    const intersects = raycaster.intersectObject(exitButton, true);
  
    if (intersects.length > 0) {
      const intersectedObject = intersects[0].object;
  
      // Dacă este apăsat butonul "Exit"
      if (intersectedObject === exitButton) {
        console.log('Hover pe butonul EXIT');
  
        // Poți adăuga aici și alte acțiuni pentru a reveni la scena principală sau a face alte modificări
        // De exemplu: activeScene = { scene, camera }; pentru a schimba scena
      }
    }
  }
  

// Setează controllerul pentru detectarea selectării
controller.addEventListener('selectstart', () => {
    // Verifică dacă controller-ul a intersectat butonul "Exit"
    const intersects2 = raycaster.intersectObject(exitButton, true);
    // Căutăm intersecțiile în scenă
    if (intersects2.length > 0) {
      const intersectedObject = intersects2[0].object;
      if (intersectedObject === exitButton) {
        console.log('Ai apăsat butonul Exit. Revenire la scena principală.');
        // Aici poți adăuga logica pentru schimbarea scenei sau alte acțiuni
        // loadMainScene();
      }
    }
  });
  
  
  // Optional, poți folosi `selectend` pentru a detecta când utilizatorul eliberează controller-ul
  controller.addEventListener('selectend', () => {
    console.log('Controller-ul a fost eliberat');
  });
  
  renderer.setAnimationLoop(() => {
    // Apelează funcția handleController pentru a actualiza intersecțiile
    handleController(controller, raycaster, laser);
    renderer.render(scene, camera);  // Randează scena
    // composer.render();
  });

  // Returnează obiectele pentru a fi folosite în `app.js`
  return { scene, camera };
}
