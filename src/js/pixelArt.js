let blocks = [];
let glassBlocks = [];
let currentImage = null;
let pixelArtData = [];

// Block lookup table pour améliorer les performances
let blockLookupTable = null;
let glassLookupTable = null;

// Block entities to avoid when "Remove Block Entities" is checked
const blockEntities = new Set([
  'banner',
  'barrel',
  'barrel[facing=up]',
  'barrel[facing=up,open=true]',
  'barrel[facing=down]',
  'beacon',
  'bed',
  'beehive',
  'bell',
  'blast_furnace',
  'brewing_stand',
  'brushable_block',
  'calibrated_sculk_sensor',
  'campfire',
  'chest',
  'chiseled_bookshelf',
  'command_block',
  'comparator',
  'conduit',
  'crafter',
  'creaking_heart',
  'daylight_detector',
  'decorated_pot',
  'dispenser',
  'dropper',
  'enchanting_table',
  'end_gateway',
  'end_portal',
  'ender_chest',
  'furnace',
  'hanging_sign',
  'hopper',
  'jigsaw',
  'jukebox',
  'lectern',
  'mob_spawner',
  'piston',
  'piston[facing=up]',
  'sculk_catalyst',
  'sculk_sensor',
  'sculk_shrieker',
  'shulker_box',
  'sign',
  'skull',
  'smoker',
  'structure_block',
  'trapped_chest',
  'trial_spawner',
  'trial_spawner[ominous=true]',
  'vault',
  'vault[ominous=true]'
]);

// Validation de sécurité des fichiers
function validateImageFile(file) {
  // Vérifier l'extension
  const allowedExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
  if (!allowedExtensions.test(file.name)) {
    return false;
  }
  
  // Vérifier le type MIME
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedMimeTypes.includes(file.type)) {
    return false;
  }
  
  // Vérifier la taille (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return false;
  }
  
  return true;
}

// Validation supplémentaire du contenu image
function validateImageContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Vérifier les magic bytes (signatures de fichiers)
      const signatures = {
        'jpg': [0xFF, 0xD8, 0xFF],
        'png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
        'gif': [0x47, 0x49, 0x46],
        'webp': [0x52, 0x49, 0x46, 0x46] // RIFF
      };

      let isValid = false;
      for (const [format, signature] of Object.entries(signatures)) {
        if (uint8Array.length >= signature.length) {
          const match = signature.every((byte, i) => uint8Array[i] === byte);
          if (match) {
            isValid = true;
            break;
          }
        }
      }
      
      if (isValid) {
        resolve(true);
      } else {
        reject(new Error('Invalid image file signature'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file.slice(0, 16)); // Lire seulement les premiers bytes
  });
}

// Load blocks and glass from JSON files
async function loadBlocks() {
  try {
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('assets/blocks.json'),
      fetch('assets/glass.json')
    ]);
    blocks = await blocksResponse.json();
    glassBlocks = await glassResponse.json();
    
    // Créer les lookup tables pour améliorer les performances
    createLookupTables();
    
    console.log(`Loaded ${blocks.length} blocks and ${glassBlocks.length} glass blocks`);
  } catch (error) {
    console.error('Error loading blocks or glass:', error);
  }
}

// Créer des lookup tables pour accélérer la recherche
function createLookupTables() {
  // Diviser l'espace de couleur en cubes pour une recherche plus rapide
  const CUBE_SIZE = 32; // Taille des cubes (0-255 divisé par 8 = 32)
  
  blockLookupTable = new Map();
  glassLookupTable = new Map();
  
  blocks.forEach(block => {
    const key = Math.floor(block.color.r / CUBE_SIZE) + ',' + 
               Math.floor(block.color.g / CUBE_SIZE) + ',' + 
               Math.floor(block.color.b / CUBE_SIZE);
    
    if (!blockLookupTable.has(key)) {
      blockLookupTable.set(key, []);
    }
    blockLookupTable.get(key).push(block);
  });
  
  glassBlocks.forEach(glass => {
    const key = Math.floor(glass.color.r / CUBE_SIZE) + ',' + 
               Math.floor(glass.color.g / CUBE_SIZE) + ',' + 
               Math.floor(glass.color.b / CUBE_SIZE);
    
    if (!glassLookupTable.has(key)) {
      glassLookupTable.set(key, []);
    }
    glassLookupTable.get(key).push(glass);
  });
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

async function handleFile(file) {
  // Validation sécurisée du fichier
  if (!validateImageFile(file)) {
    alert('Please select a valid image file (JPG, PNG, GIF, WEBP, max 10MB).');
    return;
  }
  
  try {
    // Validation du contenu
    await validateImageContent(file);
  } catch (error) {
    alert('Invalid image file. Please select a valid image.');
    console.error('Image validation failed:', error);
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
    img.onerror = () => {
      alert('Failed to load image. Please try another file.');
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
  document.getElementById('export-button').disabled = !hasPixelArt;
}

// Image processing with smart cropping
function processImage() {
  if (!currentImage) return;

  const width = parseInt(document.getElementById('width').value) || 32;
  const height = parseInt(document.getElementById('height').value) || 32;
  const blackAndWhite = document.getElementById('black-and-white').checked;
  const viewMode = document.getElementById('view-mode').value;
  const useGlass = document.getElementById('glass-overlay').checked;
  const removeBlockEntities = document.getElementById('remove-blockentities').checked;

  showProcessing('Calculating blocks...', 0);

  setTimeout(() => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = width;
      canvas.height = height;
      
      const sourceAspect = currentImage.naturalWidth / currentImage.naturalHeight;
      const targetAspect = width / height;
      
      let sourceWidth, sourceHeight, sourceX, sourceY;
      
      if (sourceAspect > targetAspect) {
        sourceHeight = currentImage.naturalHeight;
        sourceWidth = sourceHeight * targetAspect;
        sourceX = (currentImage.naturalWidth - sourceWidth) / 2;
        sourceY = 0;
      } else {
        sourceWidth = currentImage.naturalWidth;
        sourceHeight = sourceWidth / targetAspect;
        sourceX = 0;
        sourceY = (currentImage.naturalHeight - sourceHeight) / 2;
      }
      
      ctx.drawImage(currentImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height).data;
      pixelArtData = [];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          let r = imageData[index];
          let g = imageData[index + 1];
          let b = imageData[index + 2];
          const a = imageData[index + 3];

          if (blackAndWhite) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = Math.round(gray);
          }

          let pixelData = { transparent: a < 128 };
          if (!pixelData.transparent) {
            const cubeKey = `${Math.floor(r / 32)},${Math.floor(g / 32)},${Math.floor(b / 32)}`;
            const blockCandidates = blockLookupTable.get(cubeKey) || blocks;
            let closestBlock = null;
            let minDistance = Infinity;

            blockCandidates.forEach(block => {
              if (removeBlockEntities && blockEntities.has(block.name)) return;
              const distance = Math.sqrt(
                (r - block.color.r) ** 2 +
                (g - block.color.g) ** 2 +
                (b - block.color.b) ** 2
              );
              if (distance < minDistance) {
                minDistance = distance;
                closestBlock = block;
              }
            });

            pixelData.base = closestBlock;

            if (useGlass) {
              const glassCandidates = glassLookupTable.get(cubeKey) || glassBlocks;
              let closestGlass = { name: 'none', path: '', color: { r: 0, g: 0, b: 0 } };
              minDistance = Infinity;

              glassCandidates.forEach(glass => {
                const distance = Math.sqrt(
                  (r - glass.color.r) ** 2 +
                  (g - glass.color.g) ** 2 +
                  (b - glass.color.b) ** 2
                );
                if (distance < minDistance) {
                  minDistance = distance;
                  closestGlass = glass;
                }
              });

              pixelData.glass = closestGlass;
            }
          }

          pixelArtData.push(pixelData);
        }
      }

      showProcessing('Generating preview...', 0.5);
      setTimeout(() => {
        renderPixelArt(width, height, viewMode, useGlass);
      }, 100);
    } catch (error) {
      console.error('Error processing image:', error);
      const placeholder = document.getElementById('pixel-art-placeholder');
      if (placeholder) {
        placeholder.innerHTML = '<p>Error processing image. Please try again.</p>';
      }
    }
  }, 100);
}

function showProcessing(message, progress) {
  const pixelArt = document.getElementById('pixel-art');
  const placeholder = document.getElementById('pixel-art-placeholder');

  if (!pixelArt || !placeholder) {
    console.error('Required DOM elements for processing not found');
    return;
  }

  pixelArt.classList.add('hidden');
  placeholder.classList.remove('hidden');
  placeholder.innerHTML = `
    <div class="processing">
      <div class="spinner"></div>
      <p>${message}</p>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress * 100}%"></div>
        </div>
      </div>
    </div>
  `;
}

function updateProgressBar(progress) {
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.width = progress + '%';
  }
}

function hideProcessing() {
  const container = document.querySelector('.pixel-art-container');
  
  container.innerHTML = `
    <div id="pixel-art" class="pixel-art hidden"></div>
    <div class="pixel-art-placeholder hidden" id="pixel-art-placeholder">
      <p>Upload an image to see the pixel art preview</p>
    </div>
  `;
}

function applyBlackAndWhite(imageData) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Conversion en niveaux de gris avec pondération perceptuelle
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    data[i] = gray;     // R
    data[i + 1] = gray; // G
    data[i + 2] = gray; // B
    // data[i + 3] reste alpha inchangé
  }
}

function convertToBlocks(imageData, viewMode, useGlass) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const result = [];
  const removeBlockEntities = document.getElementById('remove-blockentities').checked;
  
  let filteredBlocks = blocks.filter(block => 
    viewMode === 'both' || block.view === viewMode || block.view === 'both'
  );
  
  // Filter out block entities if option is checked
  if (removeBlockEntities) {
    filteredBlocks = filteredBlocks.filter(block => !blockEntities.has(block.name));
  }
  
  const filteredGlass = glassBlocks.filter(block => 
    viewMode === 'both' || block.view === viewMode || block.view === 'both'
  );
  
  if (filteredBlocks.length === 0) {
    throw new Error('No blocks available for selected view mode and filters');
  }

  // Traiter par batch pour améliorer les performances
  const batchSize = 1000;
  for (let i = 0; i < data.length; i += 4 * batchSize) {
    const batchEnd = Math.min(i + 4 * batchSize, data.length);
    
    for (let j = i; j < batchEnd; j += 4) {
      const r = data[j];
      const g = data[j + 1];
      const b = data[j + 2];
      const a = data[j + 3];
      
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
          const { base, glass } = findNearestBlockPairFast(targetColor, filteredBlocks, filteredGlass);
          result.push({ base, glass, color: targetColor, transparent: false });
        } else {
          const base = findNearestBlockFast(targetColor, filteredBlocks);
          result.push({ 
            base, 
            glass: filteredGlass.find(b => b.name === 'none'),
            color: targetColor, 
            transparent: false 
          });
        }
      }
    }
  }
  
  return result;
}

// Version optimisée pour la recherche de blocs
function findNearestBlockFast(targetColor, availableBlocks) {
  const CUBE_SIZE = 32;
  const cubeR = Math.floor(targetColor.r / CUBE_SIZE);
  const cubeG = Math.floor(targetColor.g / CUBE_SIZE);
  const cubeB = Math.floor(targetColor.b / CUBE_SIZE);
  
  // Chercher dans le cube principal et les cubes adjacents
  const candidateBlocks = new Set();
  
  for (let dr = -1; dr <= 1; dr++) {
    for (let dg = -1; dg <= 1; dg++) {
      for (let db = -1; db <= 1; db++) {
        const key = (cubeR + dr) + ',' + (cubeG + dg) + ',' + (cubeB + db);
        const cubeBlocks = blockLookupTable.get(key);
        if (cubeBlocks) {
          cubeBlocks.forEach(block => {
            if (availableBlocks.includes(block)) {
              candidateBlocks.add(block);
            }
          });
        }
      }
    }
  }
  
  // Si aucun candidat trouvé, utiliser tous les blocs disponibles
  if (candidateBlocks.size === 0) {
    candidateBlocks.clear();
    availableBlocks.forEach(block => candidateBlocks.add(block));
  }
  
  let minDistance = Infinity;
  let bestBlock = availableBlocks[0];
  
  candidateBlocks.forEach(block => {
    const distance = colorDistanceFast(targetColor, block.color);
    if (distance < minDistance) {
      minDistance = distance;
      bestBlock = block;
    }
  });
  
  return bestBlock;
}

function findNearestBlockPairFast(targetColor, availableBlocks, availableGlass) {
  let minDistance = Infinity;
  let bestBase = availableBlocks[0];
  let bestGlass = availableGlass.find(b => b.name === 'none');
  
  // Utiliser la recherche rapide pour la base
  const candidateBases = getCandidateBlocks(targetColor, availableBlocks);
  
  candidateBases.forEach(base => {
    // Try with no glass
    let distance = colorDistanceFast(targetColor, base.color);
    if (distance < minDistance) {
      minDistance = distance;
      bestBase = base;
      bestGlass = availableGlass.find(b => b.name === 'none');
    }
    
    // Try with each glass block (mais seulement les plus pertinents)
    const relevantGlass = availableGlass.slice(0, Math.min(20, availableGlass.length));
    relevantGlass.forEach(glass => {
      if (glass.name === 'none') return;
      const blendedColor = blendColors(base.color, glass);
      distance = colorDistanceFast(targetColor, blendedColor);
      if (distance < minDistance) {
        minDistance = distance;
        bestBase = base;
        bestGlass = glass;
      }
    });
  });
  
  return { base: bestBase, glass: bestGlass };
}

function getCandidateBlocks(targetColor, availableBlocks) {
  const CUBE_SIZE = 32;
  const cubeR = Math.floor(targetColor.r / CUBE_SIZE);
  const cubeG = Math.floor(targetColor.g / CUBE_SIZE);
  const cubeB = Math.floor(targetColor.b / CUBE_SIZE);
  
  const candidates = new Set();
  
  // Chercher dans un rayon plus petit pour être plus rapide
  for (let dr = -1; dr <= 1; dr++) {
    for (let dg = -1; dg <= 1; dg++) {
      for (let db = -1; db <= 1; db++) {
        const key = (cubeR + dr) + ',' + (cubeG + dg) + ',' + (cubeB + db);
        const cubeBlocks = blockLookupTable.get(key);
        if (cubeBlocks) {
          cubeBlocks.forEach(block => {
            if (availableBlocks.includes(block)) {
              candidates.add(block);
            }
          });
        }
      }
    }
  }
  
  return candidates.size > 0 ? Array.from(candidates) : availableBlocks.slice(0, 50);
}

// Version optimisée du calcul de distance
function colorDistanceFast(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return dr * dr + dg * dg + db * db; // Pas besoin de Math.pow pour ^2
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
  return colorDistanceFast(c1, c2);
}

function renderPixelArt(width, height, viewMode, useGlass) {
  const pixelArt = document.getElementById('pixel-art');
  const placeholder = document.getElementById('pixel-art-placeholder');

  if (!pixelArt || !placeholder) {
    console.error('Required DOM elements not found');
    placeholder.innerHTML = '<p>Error: Pixel art container not found.</p>';
    return;
  }

  try {
    pixelArt.innerHTML = '';
    pixelArt.classList.remove('hidden');
    pixelArt.style.display = 'grid';
    pixelArt.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    pixelArt.style.width = '100%';
    pixelArt.style.height = 'auto';

    console.log('Rendering pixel art with', pixelArtData.length, 'pixels');

    pixelArtData.forEach((pixelData, index) => {
      const square = document.createElement('div');
      square.className = 'pixel-square';
      square.style.width = `${100 / width}%`;
      square.style.aspectRatio = '1/1';
      square.style.position = 'relative';

      if (pixelData.transparent) {
        square.style.background = `
          linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
          linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
          linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)`;
        square.style.backgroundSize = '8px 8px';
        square.style.backgroundPosition = '0 0, 0 4px, 4px -4px, -4px 0px';
      } else if (pixelData.base) {
        const baseImg = document.createElement('img');
        baseImg.className = 'base-img';
        baseImg.src = pixelData.base.path;
        baseImg.alt = pixelData.base.name;
        baseImg.style.imageRendering = viewMode === 'pixelated' ? 'pixelated' : 'auto';
        baseImg.style.width = '100%';
        baseImg.style.height = '100%';
        baseImg.style.position = 'absolute';
        baseImg.style.top = '0';
        baseImg.style.left = '0';
        baseImg.style.zIndex = '1';

        baseImg.onerror = () => {
          console.warn(`Failed to load base image: ${pixelData.base.path}`);
          square.style.backgroundColor = '#ff0000';
        };

        square.appendChild(baseImg);

        if (useGlass && pixelData.glass && pixelData.glass.name !== 'none') {
          const glassImg = document.createElement('img');
          glassImg.className = 'glass-img';
          glassImg.src = pixelData.glass.path;
          glassImg.alt = pixelData.glass.name;
          glassImg.style.imageRendering = viewMode === 'pixelated' ? 'pixelated' : 'auto';
          glassImg.style.width = '100%';
          glassImg.style.height = '100%';
          glassImg.style.position = 'absolute';
          glassImg.style.top = '0';
          glassImg.style.left = '0';
          glassImg.style.zIndex = '2';
          glassImg.style.opacity = '0.7';

          glassImg.onerror = () => {
            console.warn(`Failed to load glass image: ${pixelData.glass.path}`);
            square.style.backgroundColor = '#ff0000';
          };

          square.appendChild(glassImg);
        }
      } else {
        console.warn(`No base block for pixel at index ${index}`);
        square.style.backgroundColor = '#ff0000';
      }

      pixelArt.appendChild(square);
    });

    console.log(`Rendered ${pixelArt.children.length} pixel squares`);

    placeholder.classList.add('hidden');
    updateButtonStates();
  } catch (error) {
    console.error('Error rendering pixel art:', error);
    placeholder.innerHTML = '<p>Error rendering pixel art. Please try again.</p>';
    placeholder.classList.remove('hidden');
    pixelArt.classList.add('hidden');
  }
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

async function exportPixelArtToSchematic() {
  if (pixelArtData.length === 0) {
    alert('Please generate pixel art first!');
    return;
  }

  const width = parseInt(document.getElementById('width').value) || 32;
  const height = parseInt(document.getElementById('height').value) || 32;
  const useGlass = document.getElementById('glass-overlay').checked;

  // Load blocks and glass data
  let blocksData, glassData;
  try {
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('assets/blocks.json'),
      fetch('assets/glass.json')
    ]);
    blocksData = await blocksResponse.json();
    glassData = await glassResponse.json();
  } catch (err) {
    alert("Error loading blocks.json / glass.json: " + err.message);
    return;
  }

  // Palette
  const palette = {};
  let paletteIndex = 0;
  
  // Force air at index 0
  palette["minecraft:air"] = paletteIndex++;
  
  function getPaletteIndex(name) {
    if (!(name in palette)) palette[name] = paletteIndex++;
    return palette[name];
  }

  // Dimensions (add height for glass layer if needed)
  const schematicWidth = width;
  const schematicHeight = useGlass ? 2 : 1;
  const schematicLength = height;
  const volume = schematicWidth * schematicHeight * schematicLength;
  const blockData = new Int32Array(volume).fill(0); // 0 = air

  // Fill from pixel art data
  let validBlocks = 0;
  pixelArtData.forEach((pixel, index) => {
    const x = index % width;
    const z = Math.floor(index / width);
    
    if (pixel.transparent) {
      // Leave as air (already 0)
      return;
    }
    
    const baseName = pixel.base ? `minecraft:${pixel.base.name}` : "minecraft:air";
    const baseIndex = x + z * schematicWidth + 0 * schematicWidth * schematicLength;
    blockData[baseIndex] = getPaletteIndex(baseName);
    validBlocks++;

    if (useGlass && pixel.glass && pixel.glass.name !== 'none') {
      const glassName = `minecraft:${pixel.glass.name}`;
      const glassIndex = x + z * schematicWidth + 1 * schematicWidth * schematicLength;
      blockData[glassIndex] = getPaletteIndex(glassName);
    }
  });

  console.log(`Palette size=${paletteIndex}, Blocks=${validBlocks}`);

  const nbtData = {
    type: "compound",
    name: "",
    value: {
      Schematic: {
        type: "compound",
        value: {
          Version: { type: "int", value: 3 },
          DataVersion: { type: "int", value: 4189 },
          Width: { type: "short", value: schematicWidth },
          Height: { type: "short", value: schematicHeight },
          Length: { type: "short", value: schematicLength },
          Offset: { type: "intArray", value: [0, 0, 0] },
          
          Blocks: {
            type: "compound",
            value: {
              Palette: {
                type: "compound",
                value: Object.fromEntries(
                  Object.entries(palette).map(([name, idx]) => [
                    name, { type: "int", value: idx }
                  ])
                )
              },
              Data: { type: "byteArray", value: encodeVarIntArray(Array.from(blockData)) },
              BlockEntities: { type: "list", value: { type: "compound", value: [] } }
            }
          },
          
          Metadata: {
            type: "compound",
            value: {
              WorldEdit: {
                type: "compound",
                value: {
                  Platforms: {
                    type: "compound",
                    value: {
                      "intellectualsites:bukkit": {
                        type: "compound",
                        value: {
                          Name: { type: "string", value: "Bukkit-Official" },
                          Version: { type: "string", value: "2.12.3" }
                        }
                      }
                    }
                  },
                  EditingPlatform: { type: "string", value: "intellectualsites.bukkit" },
                  Version: { type: "string", value: "2.12.3" },
                  Origin: { type: "intArray", value: [0, 0, 0] }
                }
              },
              Date: { type: "long", value: Date.now() }
            }
          }
        }
      }
    }
  };

  // NBT Writer functions (copied from exportSchematic.js)
  function writeNBT(root) {
    const buffer = [];
    writeTag(root, buffer);
    return new Uint8Array(buffer);
  }

  function writeTag(tag, buffer, name = tag.name) {
    const tagId = getTagId(tag.type);
    buffer.push(tagId);
    writeString(name, buffer);

    switch (tag.type) {
      case "int": writeInt32(tag.value, buffer); break;
      case "short": writeInt16(tag.value, buffer); break;
      case "long": writeLong(tag.value, buffer); break;
      case "string": writeString(tag.value, buffer); break;
      case "byteArray":
        writeInt32(tag.value.length, buffer);
        tag.value.forEach(v => buffer.push(v & 0xff));
        break;
      case "intArray":
        writeInt32(tag.value.length, buffer);
        tag.value.forEach(v => writeInt32(v, buffer));
        break;
      case "compound":
        for (const [k, v] of Object.entries(tag.value)) {
          writeTag(v, buffer, k);
        }
        buffer.push(0x00);
        break;
      case "list":
        buffer.push(getTagId(tag.value.type));
        writeInt32(tag.value.value.length, buffer);
        if (tag.value.type === "compound") {
          tag.value.value.forEach(item => {
            for (const [k, v] of Object.entries(item)) {
              writeTag(v, buffer, k);
            }
            buffer.push(0x00);
          });
        }
        break;
    }
  }

  function writeInt16(val, buffer) {
    buffer.push((val >> 8) & 0xff, val & 0xff);
  }

  function writeInt32(val, buffer) {
    buffer.push(
      (val >> 24) & 0xff,
      (val >> 16) & 0xff,
      (val >> 8) & 0xff,
      val & 0xff
    );
  }

  function writeLong(val, buffer) {
    if (typeof val === 'bigint') {
      const high = Number(val >> 32n);
      const low = Number(val & 0xffffffffn);
      writeInt32(high, buffer);
      writeInt32(low, buffer);
    } else {
      writeInt32(Math.floor(val / 0x100000000), buffer);
      writeInt32(val & 0xffffffff, buffer);
    }
  }

  function writeVarInt(value, buffer) {
    while (value >= 0x80) {
      buffer.push((value & 0x7F) | 0x80);
      value >>>= 7;
    }
    buffer.push(value & 0x7F);
  }

  function encodeVarIntArray(intArray) {
    const buffer = [];
    intArray.forEach(value => writeVarInt(value, buffer));
    return buffer;
  }

  function writeString(str, buffer) {
    const bytes = new TextEncoder().encode(str);
    writeInt16(bytes.length, buffer);
    buffer.push(...bytes);
  }

  function getTagId(type) {
    return {
      byte: 1,
      short: 2,
      int: 3,
      long: 4,
      string: 8,
      list: 9,
      compound: 10,
      intArray: 11,
      byteArray: 7
    }[type] || 0;
  }

  // Export the file
  try {
    const nbtBuffer = writeNBT(nbtData);
    console.log(`NBT buffer size: ${nbtBuffer.length} bytes`);
    
    const compressed = pako.gzip(nbtBuffer);
    console.log(`Compressed size: ${compressed.length} bytes`);
    
    const blob = new Blob([compressed], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pixel_art.schem";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`.schem v3 exported! ${validBlocks} blocks processed.`);
  } catch (err) {
    alert("Export failed: " + err.message);
    console.error(err);
  }
}

// Dropdown button functionality
function setupDropdownButton() {
  const dropdownButton = document.getElementById('export-button');
  const dropdownMenu = document.querySelector('.dropdown-menu-button');
  const dropdownArrow = dropdownButton.querySelector('.dropdown-arrow');
  
  // Handle click events
  dropdownButton.addEventListener('click', (e) => {
    e.preventDefault();
    const rect = dropdownButton.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const buttonWidth = rect.width;
    
    // If clicked in the rightmost 1/6 of the button (dropdown area)
    if (clickX > buttonWidth * 5/6) {
      dropdownMenu.classList.toggle('show');
    } else {
      // Clicked in the main area (5/6 left) - export schematic
      dropdownMenu.classList.remove('show');
      exportPixelArtToSchematic();
    }
  });
  
  // Show dropdown on hover over the right part
  dropdownButton.addEventListener('mousemove', (e) => {
    const rect = dropdownButton.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const buttonWidth = rect.width;
    
    if (hoverX > buttonWidth * 5/6) {
      dropdownMenu.classList.add('show');
      dropdownButton.classList.add('dropdown-hover');
    } else {
      dropdownButton.classList.remove('dropdown-hover');
    }
  });
  
  // Hide dropdown when leaving button area (unless hovering over menu)
  dropdownButton.addEventListener('mouseleave', () => {
    dropdownButton.classList.remove('dropdown-hover');
    setTimeout(() => {
      if (!dropdownMenu.matches(':hover') && !dropdownButton.matches(':hover')) {
        dropdownMenu.classList.remove('show');
      }
    }, 100);
  });
  
  // Keep dropdown open when hovering over menu
  dropdownMenu.addEventListener('mouseenter', () => {
    dropdownMenu.classList.add('show');
  });
  
  // Hide dropdown when leaving menu
  dropdownMenu.addEventListener('mouseleave', () => {
    setTimeout(() => {
      if (!dropdownButton.matches(':hover')) {
        dropdownMenu.classList.remove('show');
      }
    }, 100);
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('show');
    }
  });
}

// Event listeners
function setupEventListeners() {
  document.getElementById('process-image').addEventListener('click', processImage);
  document.getElementById('copy-blocks').addEventListener('click', copyBlockList);
  setupDropdownButton();
  document.getElementById('width').addEventListener('input', () => {
    if (currentImage && pixelArtData.length > 0) {
      // Auto-regenerate when width changes
      setTimeout(processImage, 300);
    }
  });
  document.getElementById('height').addEventListener('input', () => {
    if (currentImage && pixelArtData.length > 0) {
      // Auto-regenerate when height changes
      setTimeout(processImage, 300);
    }
  });
  document.getElementById('black-and-white').addEventListener('change', () => {
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
  document.getElementById('remove-blockentities').addEventListener('change', () => {
    if (currentImage) {
      processImage();
    }
  });
}

// Background canvas removed - no animation needed

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  loadBlocks();
  setupUpload();
  setupEventListeners();
  updateButtonStates();
});