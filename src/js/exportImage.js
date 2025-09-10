// Export image functionality for pixel art
function exportPixelArtImage(format = 'png') {
  if (pixelArtData.length === 0) {
    alert('Please generate pixel art first!');
    return;
  }

  const width = parseInt(document.getElementById('width').value) || 32;
  const height = parseInt(document.getElementById('height').value) || 32;
  
  // Create canvas with appropriate size
  const blockSize = 32; // Fixed size for export
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = width * blockSize;
  canvas.height = height * blockSize;
  
  // Track loaded images to ensure proper sequencing
  let loadedImages = 0;
  const totalImages = pixelArtData.filter(pixel => !pixel.transparent).length;
  
  if (totalImages === 0) {
    alert('No blocks to export!');
    return;
  }
  
  // Function to finalize export once all images are loaded
  function finalizeExport() {
    const link = document.createElement('a');
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? 0.9 : undefined;
    
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `pixel_art.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, mimeType, quality);
  }
  
  // Process each pixel
  pixelArtData.forEach((pixelData, index) => {
    const x = (index % width) * blockSize;
    const y = Math.floor(index / width) * blockSize;
    
    if (pixelData.transparent) {
      // Transparent pixel - fill with checkerboard pattern
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(x, y, blockSize, blockSize);
      ctx.fillStyle = '#e0e0e0';
      
      // Create checkerboard pattern
      const checkerSize = blockSize / 8;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
          if ((i + j) % 2 === 1) {
            ctx.fillRect(x + i * checkerSize, y + j * checkerSize, checkerSize, checkerSize);
          }
        }
      }
      return;
    }
    
    if (!pixelData.base) return;
    
    // Load base image
    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    
    baseImg.onload = () => {
      // Draw base image
      ctx.drawImage(baseImg, x, y, blockSize, blockSize);
      
      // Check if there's a glass overlay
      if (pixelData.glass && pixelData.glass.name !== 'none') {
        const glassImg = new Image();
        glassImg.crossOrigin = 'anonymous';
        
        glassImg.onload = () => {
          // Save current context state
          ctx.save();
          
          // Apply transparency to glass overlay
          const alpha = pixelData.glass.alpha || 0.7;
          ctx.globalAlpha = alpha;
          
          // Draw glass overlay
          ctx.drawImage(glassImg, x, y, blockSize, blockSize);
          
          // Restore context state
          ctx.restore();
          
          loadedImages++;
          if (loadedImages === totalImages) {
            finalizeExport();
          }
        };
        
        glassImg.onerror = () => {
          console.warn(`Failed to load glass image: ${pixelData.glass.path}`);
          loadedImages++;
          if (loadedImages === totalImages) {
            finalizeExport();
          }
        };
        
        glassImg.src = pixelData.glass.path;
      } else {
        loadedImages++;
        if (loadedImages === totalImages) {
          finalizeExport();
        }
      }
    };
    
    baseImg.onerror = () => {
      console.warn(`Failed to load base image: ${pixelData.base.path}`);
      loadedImages++;
      if (loadedImages === totalImages) {
        finalizeExport();
      }
    };
    
    baseImg.src = pixelData.base.path;
  });
}