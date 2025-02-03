let isArToolkitReady = false;

const scene = new THREE.Scene();
const camera = new THREE.Camera();
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animate);
document.body.appendChild(renderer.domElement);

// Initialize AR Toolkit Source
var arToolkitSource = new ARjs.Source({
    sourceType: 'webcam'
});

arToolkitSource.init(function () {
    setTimeout(function () {
        arToolkitSource.onResizeElement();
        arToolkitSource.copyElementSizeTo(renderer.domElement);
    }, 2000);
    
    isArToolkitReady = true; // AR Toolkit source is ready
});

// Initialize AR Toolkit Context with simplified detection mode
var arToolkitContext = new ARjs.Context({
    cameraParametersUrl: 'camera_para.dat',
    detectionMode: 'mono', // Changed to 'mono' for simpler detection
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

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshNormalMaterial({
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
});
const cube = new THREE.Mesh(geometry, material);
cube.position.y = geometry.parameters.height / 2;
scene.add(cube);

function animate() {
    requestAnimationFrame(animate);
    
    // Ensure both ARToolkitSource and ARToolkitContext are ready
    if (isArToolkitReady) {
        arToolkitContext.update(arToolkitSource.domElement);
    }

    scene.visible = camera.visible;
    renderer.render(scene, camera);
}

animate();
