import { scanQRCode } from './qr-scanner.js';

let xrSession = null;
let objectPlaced = false;
let model = null; // Variabila pentru a salva modelul 3D încărcat
let scene = null; // Adăugăm scena
let camera = null; // Adăugăm camera
let renderer = null; // Adăugăm renderer-ul

async function startCamera() {
    const video = document.getElementById('qr-video');
    try {
        // Solicită camera din spate
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "environment" } } // Aceasta va selecta camera din spate
        });
        video.srcObject = stream;

        // Așteaptă ca fluxul video să fie inițializat
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play();
                console.log('Camera initialized successfully.');
                resolve();
            };
        });
    } catch (error) {
        console.error('Error accessing camera:', error);
    }
}


async function handleQRCode(video) {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video not ready yet. Retrying...");
        requestAnimationFrame(() => handleQRCode(video));
        return;
    }

    const qrData = await scanQRCode(video);
    if (qrData && !objectPlaced) {
        console.log("QR Code Detected:", qrData);
        objectPlaced = true; // Previne plasarea multiplă a obiectului
        loadModel(); // Încarcă modelul 3D
    }
    requestAnimationFrame(() => handleQRCode(video));
}

// Funcția pentru a încărca fișierul .gltf
function loadModel() {
    if (!scene) {
        console.error("Scene is not initialized!");
        return;
    }

    const loader = new THREE.GLTFLoader();

    loader.load('cube.gltf', (gltf) => {
        model = gltf.scene; // Salvează scena încărcată
        model.scale.set(0.5, 0.5, 0.5); // Poți ajusta scala dacă vrei
        model.position.set(0, 0, -5); // Poziționează modelul la o distanță în fața camerei

        // Adaugă modelul în scenă
        scene.add(model);
        console.log('Model loaded successfully!');
    }, undefined, (error) => {
        console.error('Error loading model:', error);
    });
}

async function placeObjectInXR(data) {
    const canvas = document.getElementById('webxr-canvas');
    const gl = canvas.getContext('webgl', { xrCompatible: true });

    // Asigură-te că avem o scenă, cameră și renderer
    if (!scene || !camera || !renderer) {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('webxr-canvas') });

        // Setează dimensiunea canvas-ului
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    try {
        xrSession = await navigator.xr.requestSession('immersive-ar');
        const xrLayer = new XRWebGLLayer(xrSession, gl);

        xrSession.updateRenderState({ baseLayer: xrLayer });
        const refSpace = await xrSession.requestReferenceSpace('local');

        // Ciclu de animație pentru sesiunea AR
        xrSession.requestAnimationFrame((time, frame) => {
            const pose = frame.getViewerPose(refSpace);
            const glLayer = xrSession.renderState.baseLayer;

            if (pose) {
                const viewport = glLayer.getViewport(pose.views[0]);
                gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

                // Logică pentru randarea obiectului (modelul 3D încărcat)
                if (model) {
                    model.rotation.x += 0.01; // Rotește modelul
                    model.rotation.y += 0.01;
                }
                renderer.render(scene, camera); // Randează scena
            }
        });
    } catch (error) {
        console.error('Failed to start AR session:', error);
    }
}

document.getElementById('start-xr').addEventListener('click', async () => {
    if (navigator.xr) {
        console.log("WebXR is supported!");
    } else {
        console.log("WebXR is not supported on this device/browser.");
    }
    
    if (navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')) {
        try {
            await placeObjectInXR();
            console.log("AR session started successfully.");
        } catch (error) {
            console.error('Failed to start AR session:', error);
        }
    } else {
        console.error("AR not supported on this device/browser.");
        alert("AR is not supported on this device or browser.");
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await startCamera();
    const video = document.getElementById('qr-video');
    handleQRCode(video);
});
