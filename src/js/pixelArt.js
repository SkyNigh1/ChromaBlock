let blocks = [];
let glassBlocks = [];
let currentImage = null;
let pixelArtData = [];

// Load blocks and glass from JSON files
async function loadBlocks() {
  try {
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('assets/blocks.json'),
      fetch('assets/glass.json')
    ]);
    blocks = await blocksResponse.json();
    glassBlocks = await glassResponse.json();
    console.log(`Loaded ${blocks.length} blocks and ${glassBlocks.length} glass blocks`);
  } catch (error) {
    console.error('Error loading blocks or glass:', error);
  }
}

// Upload handling
function setupUpload() {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const imagePreview = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');
  const imageDimensions = document.getElementById('image-dimensions');
  const clearBtn = document.getElementById('clear-image');

  // Click to upload
  uploadArea.addEventListener('click', () => fileInput.click());

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Clear image
  clearBtn.addEventListener('click', clearImage);
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      currentImage = img;
      showImagePreview(img, file);
      updateButtonStates();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function showImagePreview(img, file) {
  const uploadArea = document.getElementById('upload-area');
  const imagePreview = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');
  const imageDimensions = document.getElementById('image-dimensions');

  uploadArea.classList.add('hidden');
  imagePreview.classList.remove('hidden');
  previewImg.src = img.src;
  imageDimensions.textContent = `${img.naturalWidth} x ${img.naturalHeight} pixels`;
}

function clearImage() {
  const uploadArea = document.getElementById('upload-area');
  const imagePreview = document.getElementById('image-preview');
  const fileInput = document.getElementById('file-input');
  const pixelArt = document.getElementById('pixel-art');
  const placeholder = document.getElementById('pixel-art-placeholder');

  currentImage = null;
  pixelArtData = [];
  fileInput.value = '';
  uploadArea.classList.remove('hidden');
  imagePreview.classList.add('hidden');
  pixelArt.innerHTML = '';
  pixelArt.classList.add('hidden');
  placeholder.classList.remove('hidden');
  updateButtonStates();
}

function updateButtonStates() {
  const hasImage = currentImage !== null;
  const hasPixelArt = pixelArtData.length > 0;
  
  document.getElementById('process-image').disabled = !hasImage;
  document.getElementById('copy-blocks').disabled = !hasPixelArt;
  document.getElementById('export-schematic').disabled = !hasPixelArt;
}

// Image processing
function processImage() {
  if (!currentImage) return;

  const width = parseInt(document.getElementById('width').value) || 32;
  const dithering = document.getElementById('dithering').value;
  const viewMode = document.getElementById('view-mode').value;
  const useGlass = document.getElementById('glass-overlay').checked;

  showProcessing();

  // Use setTimeout to allow UI update
  setTimeout(() => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate height maintaining aspect ratio
      const aspectRatio = currentImage.naturalHeight / currentImage.naturalWidth;
      const height = Math.round(width * aspectRatio);
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and resize image
      ctx.drawImage(currentImage, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // Apply dithering if selected
      if (dithering !== 'none') {
        applyDithering(imageData, dithering);
      }
      
      // Convert to blocks
      pixelArtData = convertToBlocks(imageData, viewMode, useGlass);
      
      // Render pixel art
      renderPixelArt(pixelArtData, width, height);
      updateButtonStates();
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try a different image.');
      hideProcessing();
    }
  }, 100);
}

function showProcessing() {
  const container = document.querySelector('.pixel-art-container');
  container.innerHTML = `
    <div class="processing">
      <div class="spinner"></div>
      <p>Processing image...</p>
    </div>
  `;
}

function hideProcessing() {
  const container = document.querySelector('.pixel-art-container');
  const pixelArt = document.getElementById('pixel-art');
  const placeholder = document.getElementById('pixel-art-placeholder');
  
  container.innerHTML = '';
  container.appendChild(pixelArt);
  container.appendChild(placeholder);
}

function applyDithering(imageData, type) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  if (type === 'floyd-steinberg') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        const oldR = data[idx];
        const oldG = data[idx + 1];
        const oldB = data[idx + 2];
        
        const newR = oldR < 128 ? 0 : 255;
        const newG = oldG < 128 ? 0 : 255;
        const newB = oldB < 128 ? 0 : 255;
        
        data[idx] = newR;
        data[idx + 1] = newG;
        data[idx + 2] = newB;
        
        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;
        
        // Distribute error to neighboring pixels
        distributeError(data, width, height, x + 1, y, errR, errG, errB, 7/16);
        distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 3/16);
        distributeError(data, width, height, x, y + 1, errR, errG, errB, 5/16);
        distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 1/16);
      }
    }
  } else if (type === 'atkinson') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        const oldR = data[idx];
        const oldG = data[idx + 1];
        const oldB = data[idx + 2];
        
        const newR = Math.round(oldR / 85) * 85;
        const newG = Math.round(oldG / 85) * 85;
        const newB = Math.round(oldB / 85) * 85;
        
        data[idx] = Math.min(255, newR);
        data[idx + 1] = Math.min(255, newG);
        data[idx + 2] = Math.min(255, newB);
        
        const errR = oldR - newR;
        const errG = oldG - newG;
        const errB = oldB - newB;
        
        // Atkinson dithering pattern
        distributeError(data, width, height, x + 1, y, errR, errG, errB, 1/8);
        distributeError(data, width, height, x + 2, y, errR, errG, errB, 1/8);
        distributeError(data, width, height, x - 1, y + 1, errR, errG, errB, 1/8);
        distributeError(data, width, height, x, y + 1, errR, errG, errB, 1/8);
        distributeError(data, width, height, x + 1, y + 1, errR, errG, errB, 1/8);
        distributeError(data, width, height, x, y + 2, errR, errG, errB, 1/8);
      }
    }
  }
}

function distributeError(data, width, height, x, y, errR, errG, errB, factor) {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    const idx = (y * width + x) * 4;
    data[idx] = Math.max(0, Math.min(255, data[idx] + errR * factor));
    data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + errG * factor));
    data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + errB * factor));
  }
}

function convertToBlocks(imageData, viewMode, useGlass) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const result = [];
  
  const filteredBlocks = blocks.filter(block => 
    viewMode === 'both' || block.view === viewMode || block.view === 'both'
  );
  const filteredGlass = glassBlocks.filter(block => 
    viewMode === 'both' || block.view === viewMode || block.view === 'both'
  );
  
  if (filteredBlocks.length === 0) {
    throw new Error('No blocks available for selected view mode');
  }

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a < 128) {
      // Transparent pixel
      result.push({
        base: null,
        glass: null,
        color: { r: 0, g: 0, b: 0 },
        transparent: true
      });
    } else {
      const targetColor = { r, g, b };
      
      if (useGlass) {
        const { base, glass } = findNearestBlockPair(targetColor, filteredBlocks, filteredGlass);
        result.push({ base, glass, color: targetColor, transparent: false });
      } else {
        const base = findNearestBlock(targetColor, filteredBlocks);
        result.push({ 
          base, 
          glass: filteredGlass.find(b => b.name === 'none'),
          color: targetColor, 
          transparent: false 
        });
      }
    }
  }
  
  return result;
}

function findNearestBlock(targetColor, availableBlocks) {
  let minDistance = Infinity;
  let bestBlock = availableBlocks[0];
  
  availableBlocks.forEach(block => {
    const distance = colorDistance(targetColor, block.color);
    if (distance < minDistance) {
      minDistance = distance;
      bestBlock = block;
    }
  });
  
  return bestBlock;
}

function findNearestBlockPair(targetColor, availableBlocks, availableGlass) {
  let minDistance = Infinity;
  let bestBase = availableBlocks[0];
  let bestGlass = availableGlass.find(b => b.name === 'none');
  
  availableBlocks.forEach(base => {
    // Try with no glass
    let distance = colorDistance(targetColor, base.color);
    if (distance < minDistance) {
      minDistance = distance;
      bestBase = base;
      bestGlass = availableGlass.find(b => b.name === 'none');
    }
    
    // Try with each glass block
    availableGlass.forEach(glass => {
      if (glass.name === 'none') return;
      const blendedColor = blendColors(base.color, glass);
      distance = colorDistance(targetColor, blendedColor);
      if (distance < minDistance) {
        minDistance = distance;
        bestBase = base;
        bestGlass = glass;
      }
    });
  });
  
  return { base: bestBase, glass: bestGlass };
}

function blendColors(baseColor, glassBlock) {
  if (!glassBlock || glassBlock.name === 'none') return baseColor;
  const alpha = glassBlock.alpha || 0.5;
  const r = Math.round((1 - alpha) * baseColor.r + alpha * glassBlock.color.r);
  const g = Math.round((1 - alpha) * baseColor.g + alpha * glassBlock.color.g);
  const b = Math.round((1 - alpha) * baseColor.b + alpha * glassBlock.color.b);
  return { r, g, b };
}

function colorDistance(c1, c2) {
  return Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2);
}

function renderPixelArt(data, width, height) {
  hideProcessing();
  
  const pixelArt = document.getElementById('pixel-art');
  const placeholder = document.getElementById('pixel-art-placeholder');
  
  pixelArt.innerHTML = '';
  placeholder.classList.add('hidden');
  pixelArt.classList.remove('hidden');
  
  // Calculate block size to fit in container (max 735px like gradients)
  const maxSize = 735;
  const blockSize = Math.min(32, Math.floor(maxSize / Math.max(width, height)));
  
  pixelArt.style.display = 'grid';
  pixelArt.style.gridTemplateColumns = `repeat(${width}, ${blockSize}px)`;
  pixelArt.style.gridTemplateRows = `repeat(${height}, ${blockSize}px)`;
  pixelArt.style.width = `${width * blockSize}px`;
  pixelArt.style.height = `${height * blockSize}px`;
  
  data.forEach((pixelData, index) => {
    const div = document.createElement('div');
    div.className = 'pixel-square';
    div.style.width = `${blockSize}px`;
    div.style.height = `${blockSize}px`;
    div.style.position = 'relative';
    
    if (pixelData.transparent) {
      // Transparent pixel - use air block or checkerboard pattern
      div.style.background = 'repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px';
      div.innerHTML = `<span class="tooltip">Air</span>`;
    } else if (pixelData.base) {
      const baseImg = `<img src="${pixelData.base.path}" alt="${pixelData.base.name}" class="base-img" />`;
      const glassImg = pixelData.glass && pixelData.glass.name !== 'none' ? 
        `<img src="${pixelData.glass.path}" alt="${pixelData.glass.name}" class="glass-img" />` : '';
      const tooltip = pixelData.glass && pixelData.glass.name !== 'none' ? 
        `Base: ${pixelData.base.name}, Glass: ${pixelData.glass.name}` : 
        `Base: ${pixelData.base.name}`;
      div.innerHTML = `${baseImg}${glassImg}<span class="tooltip">${tooltip}</span>`;
    }
    
    pixelArt.appendChild(div);
  });
}

// Export functions
function copyBlockList() {
  if (pixelArtData.length === 0) return;
  
  const blockList = pixelArtData.map(pixel => {
    if (pixel.transparent) return 'Air';
    if (pixel.glass && pixel.glass.name !== 'none') {
      return `Base: ${pixel.base.name}, Glass: ${pixel.glass.name}`;
    }
    return `Base: ${pixel.base.name}`;
  });
  
  navigator.clipboard.writeText(blockList.join('\n')).then(() => {
    alert('Block list copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy block list');
  });
}

// Event listeners
function setupEventListeners() {
  document.getElementById('process-image').addEventListener('click', processImage);
  document.getElementById('copy-blocks').addEventListener('click', copyBlockList);
  document.getElementById('width').addEventListener('input', () => {
    if (currentImage && pixelArtData.length > 0) {
      // Auto-regenerate when width changes
      setTimeout(processImage, 300);
    }
  });
  document.getElementById('dithering').addEventListener('change', () => {
    if (currentImage) {
      processImage();
    }
  });
  document.getElementById('view-mode').addEventListener('change', () => {
    if (currentImage) {
      processImage();
    }
  });
  document.getElementById('glass-overlay').addEventListener('change', () => {
    if (currentImage) {
      processImage();
    }
  });
}

// Background canvas animation (reuse from main site)
function initBackgroundCanvas() {
  const canvas = document.getElementById('background-canvas');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  let animationId;
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  function drawBackground() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw some floating particles
    const time = Date.now() * 0.001;
    ctx.fillStyle = 'rgba(41, 255, 137, 0.1)';
    
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(time + i) * 200) + canvas.width / 2;
      const y = (Math.cos(time + i * 0.5) * 150) + canvas.height / 2;
      const size = Math.sin(time + i * 2) * 3 + 5;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    animationId = requestAnimationFrame(drawBackground);
  }
  
  resizeCanvas();
  drawBackground();
  
  window.addEventListener('resize', resizeCanvas);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  loadBlocks();
  setupUpload();
  setupEventListeners();
  initBackgroundCanvas();
  updateButtonStates();
});