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
  document.getElementById('export-schematic').disabled = !hasPixelArt;
}

// Image processing with smart cropping
function processImage() {
  if (!currentImage) return;

  const width = parseInt(document.getElementById('width').value) || 32;
  const height = parseInt(document.getElementById('height').value) || 32;
  const blackAndWhite = document.getElementById('black-and-white').checked;
  const viewMode = document.getElementById('view-mode').value;
  const useGlass = document.getElementById('glass-overlay').checked;

  showProcessing();

  // Use setTimeout to allow UI update
  setTimeout(() => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = width;
      canvas.height = height;
      
      // Calculate source crop area to maintain aspect ratio
      const sourceAspect = currentImage.naturalWidth / currentImage.naturalHeight;
      const targetAspect = width / height;
      
      let sourceWidth, sourceHeight, sourceX, sourceY;
      
      if (sourceAspect > targetAspect) {
        // Source is wider than target - crop horizontally
        sourceHeight = currentImage.naturalHeight;
        sourceWidth = sourceHeight * targetAspect;
        sourceX = (currentImage.naturalWidth - sourceWidth) / 2;
        sourceY = 0;
      } else {
        // Source is taller than target - crop vertically  
        sourceWidth = currentImage.naturalWidth;
        sourceHeight = sourceWidth / targetAspect;
        sourceX = 0;
        sourceY = (currentImage.naturalHeight - sourceHeight) / 2;
      }
      
      // Draw cropped and resized image
      ctx.drawImage(
        currentImage,
        sourceX, sourceY, sourceWidth, sourceHeight,  // Source crop area
        0, 0, width, height                           // Destination
      );
      
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // Apply black and white conversion if selected
      if (blackAndWhite) {
        applyBlackAndWhite(imageData);
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

// Event listeners
function setupEventListeners() {
  document.getElementById('process-image').addEventListener('click', processImage);
  document.getElementById('copy-blocks').addEventListener('click', copyBlockList);
  document.getElementById('export-schematic').addEventListener('click', exportPixelArtToSchematic);
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