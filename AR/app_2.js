let isArToolkitReady = false;
let isFrontCamera = true;  // Initially using the front camera
let currentModelIndex = 0; // Indexul modelului curent
let models = []; // Modelele încărcate din map-scene.json

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

    if (arToolkitSource && arToolkitSource.domElement) {
        arToolkitSource.domElement.srcObject?.getTracks().forEach(track => track.stop());
    }
    // Create a new AR Toolkit Source with the appropriate camera
    arToolkitSource = new ARjs.Source({
        sourceType: 'webcam',
        facingMode: isFrontCamera ? { exact: 'user' } : { exact: 'environment' }
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
}

// Initialize AR Toolkit Context
var arToolkitContext = new ARjs.Context({
    cameraParametersUrl: 'ARtools/camera_para.dat',
    detectionMode: 'mono',
});

arToolkitContext.init(function () {
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
});

// Initialize Marker Controls
var arMarkerControls = new ARjs.MarkerControls(arToolkitContext, camera, {
    type: 'pattern',
    patternUrl: 'ARtools/pattern-marker.patt',
    changeMatrixMode: 'cameraTransformMatrix'
});

scene.visible = false;

// Load map-scene.json and create objects
fetch('map-scene.json')
    .then(response => response.json())
    .then(data => {
        models = data.models;
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

    mapData.models.forEach((modelData, index) => {
        loader.load(modelData.name, (gltf) => {
            const object = gltf.scene;
            object.scale.set(modelData.scale, modelData.scale, modelData.scale);
            object.visible = false; // Ascundem toate modelele inițial
            object.userData.originalName = modelData.name;   
            // scene.add(object); // Adăugăm modelul în scenă
            models[index] = object; // Stocăm obiectul în array-ul models, înlocuind obiectele brute

            console.log(`Preloaded model: ${modelData.name}`);
            
            if (index === 0) {
                scene.add(object);
                object.visible = true; // Facem modelul vizibil
                console.log(`Added model to scene: ${modelData.name}`);
            }
    

        }, undefined, (error) => {
            console.error(`Error loading model ${modelData.name}:`, error);
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
    scene.visible = isVisible;
    scene.children.forEach((child) => {
        child.visible = isVisible;
    });
}

// Funcția de animație
function animate() {
    requestAnimationFrame(animate);

    if (isArToolkitReady) {
        arToolkitContext.update(arToolkitSource.domElement);
    }

    const markerVisible = arMarkerControls.object3d.visible;
    const currentTime = performance.now();

    if (camera.visible) {
        if (!scene.visible) {
            setSceneVisibility(true);
        }

        if (markerVisible && object && !scene.contains(object)) {
            scene.add(object);
            console.log('Obiectul a fost adăugat în scenă!');
        }

        if (currentTime - lastRenderTime >= renderInterval) {
            renderer.render(scene, camera);
            lastRenderTime = currentTime;
        }

    } else {
        if (scene.visible) {
            setSceneVisibility(false);
        }

        if (!markerVisible && object && scene.contains(object)) {
            scene.remove(object);
            console.log('Obiectul a fost șters din scenă deoarece markerul nu este vizibil.');
        }

        renderer.render(scene, camera);
    }
}
animate();

// Buton pentru schimbarea modelului
const changeModelButton = document.getElementById('changeModelButton');

changeModelButton.addEventListener('click', () => {
    console.log('Change model button clicked!');
    console.log('Models loaded:', models);
    changeModel();
    
});

function changeModel() {
    // Ascunde modelul curent
    if (models[currentModelIndex]) {
        models[currentModelIndex].visible = false;
        console.log(`Hiding model: ${models[currentModelIndex].userData.originalName}`);
        scene.remove(models[currentModelIndex]); // Eliminăm modelul din scenă
    }

    // Actualizează indexul modelului curent
    currentModelIndex = (currentModelIndex + 1) % models.length;

    // Arată noul model
    if (models[currentModelIndex]) {
        scene.add(models[currentModelIndex]); // Adăugăm modelul în scenă
        models[currentModelIndex].visible = true;
        console.log(`Showing model: ${models[currentModelIndex].userData.originalName}`);
    }
}



function animateOpacity(target, startOpacity, endOpacity, onComplete) {
    const duration = 1000;
    let startTime = null;

    function animateSwitch(time) {
        if (!startTime) startTime = time;
        const elapsedTime = time - startTime;
        const progress = Math.min(elapsedTime / duration, 1);
        const currentOpacity = startOpacity + (endOpacity - startOpacity) * progress;

        target.traverse((child) => {
            if (child.isMesh) {
                if (!child.material.transparent) {
                    child.material.transparent = true;
                }
                child.material.opacity = currentOpacity;
            }
        });

        if (progress < 1) {
            requestAnimationFrame(animateSwitch);
        } else if (onComplete) {
            onComplete();
        }
    }

    requestAnimationFrame(animateSwitch);
}
