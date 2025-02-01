import { scanQRCode } from './qr-scanner.js';

let xrSession = null;
let objectPlaced = false;

async function startCamera() {
    const video = document.getElementById('qr-video');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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
        placeObjectInXR(qrData);
        objectPlaced = true; // Prevent multiple object placements
    }
    requestAnimationFrame(() => handleQRCode(video));
}


async function placeObjectInXR(data) {
    const canvas = document.getElementById('webxr-canvas');
    const gl = canvas.getContext('webgl', { xrCompatible: true });

    // Asigură-te că sesiunea este inițiată doar după o acțiune a utilizatorului
    document.getElementById('start-xr').addEventListener('click', async () => {
        try {
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

                    // Logică pentru randarea obiectului
                    drawCubeWithThreeJS(gl);
                }
            });
        } catch (error) {
            console.error('Failed to start AR session:', error);
        }
    });
}


function drawCubeWithThreeJS(gl) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('webxr-canvas') });

    // Creează un cub 3D
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    // Setează poziția camerei
    camera.position.z = 5;

    // Creează un ciclu de animație pentru a reda scena
    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await startCamera();
    const video = document.getElementById('qr-video');
    handleQRCode(video);
});

document.getElementById('start-xr').addEventListener('click', async () => {
    if (navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')) {
        try {
            xrSession = await navigator.xr.requestSession('immersive-ar');
            console.log("AR session started successfully.");
            // Continuă cu inițializarea
        } catch (error) {
            console.error('Failed to start AR session:', error);
        }
    } else {
        console.error("AR not supported on this device/browser.");
        alert("AR is not supported on this device or browser.");
    }
});

