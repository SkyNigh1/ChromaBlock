function exportPixelArtToImage(format) {
  if (pixelArtData.length === 0) {
    alert('Please generate pixel art first!');
    return;
  }

  const width = parseInt(document.getElementById('width').value) || 32;
  const height = parseInt(document.getElementById('height').value) || 32;

  // Create a canvas to composite the images
  const canvas = document.createElement('canvas');
  canvas.width = width * 16; // Assuming each block texture is 16x16 pixels
  canvas.height = height * 16;
  const ctx = canvas.getContext('2d');

  // Process each pixel
  const loadPromises = pixelArtData.map((pixel, index) => {
    return new Promise((resolve) => {
      const x = (index % width) * 16;
      const y = Math.floor(index / width) * 16;

      if (pixel.transparent) {
        // Draw checkerboard pattern for transparent pixels
        ctx.fillStyle = 'repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px';
        ctx.fillRect(x, y, 16, 16);
        resolve();
        return;
      }

      const baseImg = new Image();
      baseImg.crossOrigin = "Anonymous";
      baseImg.onload = () => {
        ctx.drawImage(baseImg, x, y, 16, 16);

        if (pixel.glass && pixel.glass.name !== 'none') {
          const glassImg = new Image();
          glassImg.crossOrigin = "Anonymous";
          glassImg.onload = () => {
            ctx.globalAlpha = 0.7; // Match CSS opacity for glass
            ctx.drawImage(glassImg, x, y, 16, 16);
            ctx.globalAlpha = 1.0;
            resolve();
          };
          glassImg.onerror = () => {
            console.error(`Failed to load glass image: ${pixel.glass.path}`);
            resolve(); // Continue even if glass image fails
          };
          glassImg.src = pixel.glass.path;
        } else {
          resolve();
        }
      };
      baseImg.onerror = () => {
        console.error(`Failed to load base image: ${pixel.base.path}`);
        resolve(); // Continue even if base image fails
      };
      baseImg.src = pixel.base.path;
    });
  });

  // Wait for all images to load and be drawn
  Promise.all(loadPromises).then(() => {
    // Determine MIME type and quality
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? 0.9 : undefined;

    // Export the canvas as a blob
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pixel_art.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`${format.toUpperCase()} exported successfully!`);
    }, mimeType, quality);
  }).catch(err => {
    console.error('Error exporting image:', err);
    alert('Failed to export image.');
  });
}

function setupExportDropdown() {
  const exportButton = document.getElementById('export-button');
  const dropdownItems = document.querySelectorAll('.dropdown-content a');

  // Handle main button click (default to .schem)
  exportButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (!exportButton.disabled) {
      exportPixelArtToSchematic();
    }
  });

  // Handle dropdown item clicks
  dropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const format = item.getAttribute('data-format');
      if (format === 'schem') {
        exportPixelArtToSchematic();
      } else {
        exportPixelArtToImage(format);
      }
    });
  });
}

// Initialize dropdown event listeners
document.addEventListener('DOMContentLoaded', setupExportDropdown);