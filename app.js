import { scanQRCode } from './qr-scanner.js';

let xrSession = null;
let objectPlaced = false;

async function startCamera() {
    const video = document.getElementById('qr-video');
    try {
        // Accesarea camerei dispozitivului
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.play(); // Pornește redarea fluxului video
        console.log('Camera initialized successfully.');
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert(`Failed to access camera: ${error.message}`);
    }
}

async function handleQRCode(video) {
    const qrData = await scanQRCode(video);
    if (qrData && !objectPlaced) {
        console.log("QR Code Detected:", qrData);
        placeObjectInXR(qrData);
        objectPlaced = true; // Prevent multiple object placements
    }
    requestAnimationFrame(() => handleQRCode(video));
}

async function placeObjectInXR(data) {
    // Initialize WebXR
    const canvas = document.getElementById('webxr-canvas');
    const gl = canvas.getContext('webgl', { xrCompatible: true });
    xrSession = await navigator.xr.requestSession('immersive-ar');
    const xrLayer = new XRWebGLLayer(xrSession, gl);

    xrSession.updateRenderState({ baseLayer: xrLayer });

    const refSpace = await xrSession.requestReferenceSpace('local');

    xrSession.requestAnimationFrame((time, frame) => {
        const pose = frame.getViewerPose(refSpace);
        const glLayer = xrSession.renderState.baseLayer;

        if (pose) {
            const viewport = glLayer.getViewport(pose.views[0]);
            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

            // Your 3D Object Rendering Logic Here
            drawObject(gl, data);
        }
    });
}

function drawObject(gl, data) {
    // Logic for rendering a 3D model
    console.log(`Rendering object for data: ${data}`);
    // Example: Load and display a model based on QR code data
}

document.addEventListener('DOMContentLoaded', async () => {
    await startCamera();
    const video = document.getElementById('qr-video');
    handleQRCode(video);
});
