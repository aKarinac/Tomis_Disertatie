let isArToolkitReady = false;
let isFrontCamera = true;  // Initially using the front camera

const scene = new THREE.Scene();
const camera = new THREE.Camera();
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true,
    powerPreference: "low-power"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Initialize AR Toolkit Source with a placeholder value
let arToolkitSource = new ARjs.Source({
    sourceType: 'webcam'
});

// Switch camera between front and back
function switchCamera() {
    isFrontCamera = !isFrontCamera;

    // Create a new AR Toolkit Source with the appropriate camera
    arToolkitSource = new ARjs.Source({
        sourceType: 'webcam',
        facingMode: isFrontCamera ? { exact: 'user' } : { exact: 'environment' } // 'user' is front camera, 'environment' is back camera
    });

    // Re-initialize the AR Toolkit Source
    arToolkitSource.init(function () {
        setTimeout(function () {
            arToolkitSource.onResizeElement();
            arToolkitSource.copyElementSizeTo(renderer.domElement);
        }, 2000);
        isArToolkitReady = true;
    });

    console.log(isFrontCamera ? "Switched to Front Camera" : "Switched to Back Camera");

    // Găsește canvas-ul utilizat de AR.js
    const arCanvas = document.querySelector('canvas');
    if (arCanvas) {
        arCanvas.width = arCanvas.width; // Resetează canvas-ul
        arCanvas.getContext('2d', { willReadFrequently: true });
        console.log("Setat willReadFrequently pe canvas-ul AR.js.");
    }

}

// Initialize AR Toolkit Context
var arToolkitContext = new ARjs.Context({
    cameraParametersUrl: 'camera_para.dat',
    detectionMode: 'mono',  // Using 'mono' for simpler detection
});

arToolkitContext.init(function () {
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
});

// Initialize Marker Controls
var arMarkerControls = new ARjs.MarkerControls(arToolkitContext, camera, {
    type: 'pattern',
    patternUrl: 'pattern-marker.patt',
    changeMatrixMode: 'cameraTransformMatrix'
});

scene.visible = false;

// const geometry = new THREE.BoxGeometry(1, 1, 1);
// const material = new THREE.MeshNormalMaterial({
//     transparent: true,
//     opacity: 0.5,
//     side: THREE.DoubleSide
// });
// const cube = new THREE.Mesh(geometry, material);
// cube.position.y = geometry.parameters.height / 2;
// scene.add(cube);

// Load map-scene.json and create objects
fetch('map-scene.json')
    .then(response => response.json())
    .then(data => {
        setupSceneFromMap(data);
    })
    .catch(err => console.error("Error loading map-scene.json:", err));

function setupSceneFromMap(mapData) {
    // Add ambient light if defined
    if (mapData.ambientLight) {
        const ambientLight = new THREE.AmbientLight(mapData.ambientLight.color, mapData.ambientLight.intensity);
        scene.add(ambientLight);
    }

    // Add directional light if enabled
    if (mapData.directionalLight?.enabled) {
        const dirLight = new THREE.DirectionalLight(mapData.directionalLight.color);
        dirLight.position.set(...mapData.directionalLight.pos);
        scene.add(dirLight);
    }

    // Add fog if enabled
    if (mapData.fog?.enabled) {
        scene.fog = new THREE.Fog(mapData.fog.color, mapData.fog.near, mapData.fog.far);
    }

    // Load models
    const loader = new THREE.GLTFLoader();

    mapData.models.forEach(model => {
        loader.load(model.name, gltf => {
            const object = gltf.scene;
            object.scale.set(model.scale, model.scale, model.scale);
            scene.add(object);
        }, undefined, error => {
            console.error(`Error loading model ${model.name}:`, error);
        });
    });
}

// Button event listener to switch cameras
document.getElementById('switchCameraButton').addEventListener('click', switchCamera);

let lastRenderTime = 0; // Variabilă pentru timpul ultimei randări
const renderInterval = 1000; // Intervalul de randare în milisecunde (2 secunde)
let object = null; // Referință globală la obiectul încărcat

// Funcție pentru a seta vizibilitatea tuturor obiectelor din scenă
function setSceneVisibility(isVisible) {
    scene.visible = isVisible; // Ascunde sau arată scena
    scene.children.forEach((child) => {
        child.visible = isVisible; // Ascunde sau arată fiecare copil din scenă
    });
}

// Funcția de animație
function animate() {
    requestAnimationFrame(animate);

    if (isArToolkitReady) {
        // Actualizează contextul ARToolKit
        arToolkitContext.update(arToolkitSource.domElement);
    }

    const markerVisible = arMarkerControls.object3d.visible; // Verifică vizibilitatea markerului
    const currentTime = performance.now(); // Obține timpul curent

    // Verifică dacă markerul este vizibil
    if (camera.visible) {
        // Dacă markerul este detectat și au trecut 2 secunde
        if (!scene.visible) {
            setSceneVisibility(true); // Setează scena vizibilă
        }

        // Adăugăm obiectul doar dacă markerul este vizibil și obiectul nu este deja în scenă
        if (markerVisible && object && !scene.contains(object)) {
            scene.add(object);
            console.log('Obiectul a fost adăugat în scenă!');
        }

        // Dacă markerul este vizibil și a trecut intervalul de timp, renderizează scena
        if (currentTime - lastRenderTime >= renderInterval) {
            renderer.render(scene, camera);
            lastRenderTime = currentTime;
        }

    } else {
        // Dacă markerul nu mai este vizibil
        if (scene.visible) {
            setSceneVisibility(false); // Ascunde scena și obiectele din scenă
        }

        // Elimină obiectul dacă markerul nu este vizibil
        if (!markerVisible && object && scene.contains(object)) {
            scene.remove(object);
            console.log('Obiectul a fost șters din scenă deoarece markerul nu este vizibil.');
        }

        // Renderizează scena imediat ce markerul dispare, chiar dacă nu au trecut cele 2 secunde
        renderer.render(scene, camera);
    }
}


animate();
