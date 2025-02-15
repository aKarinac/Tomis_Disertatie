
// Funcție pentru a intra în sesiunea VR
function enterVR() {
    const button = document.getElementById('enterVRButton');
    const scene = document.querySelector('a-scene');
    const camera = document.getElementById('camera');

    // Ascunde butonul atunci când intri în VR
    button.style.display = 'none';

    // Verificăm dacă WebXR este disponibil
    if (navigator.xr) {
        // Activăm sesiunea VR
        navigator.xr.requestDevice()
            .then(device => {
                return device.requestSession({ immersive: true });
            })
            .then(session => {
                // Setăm sesiunea WebXR
                scene.enterVR();
                scene.setAttribute('xr-primitive', 'session', session);

                // Camera va intra în mod VR
                camera.setAttribute('wasd-controls', 'enabled', false); // dezactivăm controalele WASD
                camera.setAttribute('look-controls', 'enabled', true);  // activăm controlul privirii VR
            })
            .catch(err => {
                console.error('Eroare la intrarea în sesiunea VR:', err);
            });
    } else {
        alert('WebXR nu este suportat de acest browser!');
    }
}


document.addEventListener('DOMContentLoaded', () => {
  
    // Adăugăm funcționalitatea de selecție pentru controllere
    const controllers = document.querySelectorAll('[laser-controls]');
    const interactiveObjects = document.querySelectorAll('.interactive');
    controllers.forEach((controller) => {
  
      controller.addEventListener('triggertouchstart', (event) => {
        console.log('selectstart activat');
        const intersection = controller.components.raycaster.getIntersection(interactiveObjects);
        if (intersection) {
          const selectedObject = intersection.el;
          const cubeId = selectedObject.getAttribute('id');
          console.log(`Cub selectat: ${cubeId}`);
          redirectToScene(cubeId);
        } else {
            console.log("Nu s-a intersectat cu niciun cub!");
          }
      });
    });
  
    // Asigurăm raycaster pentru controllere
    controllers.forEach(controller => {
      controller.addEventListener('raycaster-intersected', event => {
          const intersection = event.detail.intersectedEl;
          if (intersection && intersection.classList.contains('interactive')) {
              console.log(`Obiectul intersectat: ${intersection.id}`);
          }
      });
  });
  
    // Funcție pentru schimbarea scenei
    window.redirectToScene = function (cubeId) {
      const scene = document.querySelector('a-scene');
      // Dacă vrei să înlocuiești doar unele părți, poți adăuga doar entitățile relevante
      const newSceneContent = `
        <a-entity 
          geometry="primitive: box; width: 10; height: 1; depth: 10"
          material="color: lightblue"
          position="0 0 -5"
          static-body></a-entity>
        <a-camera position="0 1.5 5" wasd-controls look-controls>
          <a-entity
            text="value: Ai selectat ${cubeId}; color: black; align: center;"
            position="0 1.5 -3">
          </a-entity>
        </a-camera>
      `;
      
      // Înlocuiește doar secțiunea relevantă a scenei
      scene.insertAdjacentHTML('beforeend', newSceneContent);
  };
  
  });
