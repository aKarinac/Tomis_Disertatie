export async function scanQRCode(videoElement) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Verifică dacă video-ul este disponibil
    if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        console.error("Video element dimensions are zero. Unable to scan QR code.");
        return null;
    }

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    return code?.data || null;
}
