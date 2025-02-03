const QRCode = require('qrcode');

// Calea locală către fișierul tău HTML care vizualizează modelul
const localViewerLink = "http://localhost:5500/threejsVisualizor.html"; // Înlocuiește cu link-ul corect pentru vizualizatorul tău 3D

// Generarea codului QR
QRCode.toFile('local_model_qr.png', localViewerLink, (err) => {
    if (err) return console.error("Eroare:", err);
    console.log('Codul QR pentru vizualizatorul local a fost salvat ca local_model_qr.png');
});
