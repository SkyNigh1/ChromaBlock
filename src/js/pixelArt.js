let blocks = [];
let glassBlocks = [];
let currentImage = null;
let pixelArtData = [];

// Configuration de sécurité
const SECURITY_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB max
  MAX_DIMENSIONS: 512, // Max width/height
  ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
  MAX_CANVAS_SIZE: 128 * 128, // Limite pour éviter les attaques DoS
  TIMEOUT_MS: 30000 // 30 secondes max pour le traitement
};

// Block entities à éviter quand "Remove Block Entities" est coché
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

// Fonction de validation sécurisée des fichiers
function validateFile(file) {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return errors;
  }
  
  // Vérification du type MIME
  if (!SECURITY_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    errors.push(`File type not allowed: ${file.type}`);
  }
  
  // Vérification de la taille
  if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max: ${SECURITY_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }
  
  // Vérification de l'extension
  const extension = file.name.split('.').pop().toLowerCase();
  const allowedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension not allowed: ${extension}`);
  }
  
  return errors;
}

// Fonction de validation des dimensions d'image
function validateImageDimensions(img) {
  const errors = [];
  
  if (img.naturalWidth > SECURITY_CONFIG.MAX_DIMENSIONS || img.naturalHeight > SECURITY_CONFIG.MAX_DIMENSIONS) {
    errors.push(`Image dimensions too large: ${img.naturalWidth}x${img.naturalHeight} (max: ${SECURITY_CONFIG.MAX_DIMENSIONS}x${SECURITY_CONFIG.MAX_DIMENSIONS})`);
  }
  
  if (img.naturalWidth < 8 || img.naturalHeight < 8) {
    errors.push('Image dimensions too small (min: 8x8)');
  }
  
  return errors;
}

// Chargement sécurisé des blocs
async function loadBlocks() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.TIMEOUT_MS);
    
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('assets/blocks.json', { signal: controller.signal }),
      fetch('assets/glass.json', { signal: controller.signal })
    ]);
    
    clearTimeout(timeoutId);
    
    if (!blocksResponse.ok || !glassResponse.ok) {
      throw new Error('Failed to load block data');
    }
    
    blocks = await blocksResponse.json();
    glassBlocks = await glassResponse.json();
    
    // Validation des données chargées
    if (!Array.isArray(blocks) || !Array.isArray(glassBlocks)) {
      throw new Error('Invalid block data format');
    }
    
    console.log(`Loaded ${blocks.length} blocks and ${glassBlocks.length} glass blocks`);
  } catch (error) {
    console.error('Error loading blocks:', error);
    throw error;
  }
}

// Configuration de l'upload avec sécurité renforcée
function setupUpload() {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const imagePreview = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');
  const imageDimensions = document.getElementById('image-dimensions');
  const clearBtn = document.getElementById('clear-image');

  // Click to upload
  uploadArea.addEventListener('click', () => fileInput.click());

  // Drag and drop avec validation
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

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  clearBtn.addEventListener('click', clearImage);
}

// Gestion sécurisée des fichiers
function handleFile(file) {
  const errors = validateFile(file);
  
  if (errors.length > 0) {
    alert('File validation failed:\n' + errors.join('\n'));
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => {
    alert('Error reading file');
  };
  
  reader.onload = (e) => {
    const img = new Image();
    img.onerror = () => {
      alert('Invalid image file or corrupted data');
    };
    
    img.onload = () => {
      const dimensionErrors = validateImageDimensions(img);
      
      if (dimensionErrors.length > 0) {
        alert('Image validation failed:\n' + dimensionErrors.join('\n'));
        return;
      }
      
      currentImage = img;
      showImagePreview(img, file);
      updateButtonStates();
    };
    
    // Sécurité : créer une URL blob au lieu d'utiliser directement les données
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

// Traitement d'image amélioré et optimisé
function processImage() {
  if (!currentImage) return;

  const width = Math.min(parseInt(document.getElementById('width').value) || 32, 128);
  const height = Math.min(parseInt(document.getElementById('height').value) || 32, 128);
  const blackWhite = document.getElementById('black-white').checked;
  const viewMode = document.getElementById('view-mode').value;
  const useGlass = document.getElementById('glass-overlay').checked;

  // Validation de sécurité
  if (width * height > SECURITY_CONFIG.MAX_CANVAS_SIZE) {
    alert(`Canvas size too large: ${width}x${height} (max: ${Math.sqrt(SECURITY_CONFIG.MAX_CANVAS_SIZE)}x${Math.sqrt(SECURITY_CONFIG.MAX_CANVAS_SIZE)})`);
    return;
  }

  showProcessing();

  // Traitement asynchrone pour éviter le blocage de l'UI
  setTimeout(() => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Unable to create canvas context');
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Calcul optimisé de la zone de crop
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
      
      // Dessin avec gestion d'erreur
      ctx.imageSmoothingEnabled = false; // Pixels nets
      ctx.drawImage(
        currentImage,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, width, height
      );
      
      const imageData = ctx.getImageData(0, 0, width, height);
      
      // Application du filtre noir et blanc si nécessaire
      if (blackWhite) {
        applyBlackWhiteFilter(imageData);
      }
      
      // Conversion optimisée vers les blocs
      pixelArtData = convertToBlocks(imageData, viewMode, useGlass);
      
      // Rendu du pixel art
      renderPixelArt(pixelArtData, width, height);
      updateButtonStates();
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try a different image or reduce dimensions.');
      hideProcessing();
    }
  }, 100);
}

// Nouveau filtre noir et blanc
function applyBlackWhiteFilter(imageData) {
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    // Formule de luminance optimisée (ITU-R BT.709)
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;       // Rouge
    data[i + 1] = gray;   // Vert
    data[i + 2] = gray;   // Bleu
    // Alpha reste inchangé
  }
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

// Conversion optimisée vers les blocs
function convertToBlocks(imageData, viewMode, useGlass) {
  const data = imageData.data;
  const result = [];
  const removeBlockEntities = document.getElementById('remove-blockentities').checked;
  
  // Filtrage optimisé des blocs
  let filteredBlocks = blocks.filter(block => 
    (viewMode === 'both' || block.view === viewMode || block.view === 'both') &&
    (!removeBlockEntities || !blockEntities.has(block.name))
  );
  
  const filteredGlass = glassBlocks.filter(block => 
    viewMode === 'both' || block.view === viewMode || block.view === 'both'
  );
  
  if (filteredBlocks.length === 0) {
    throw new Error('No blocks available for selected view mode and filters');
  }

  // Précompilation des couleurs pour l'optimisation
  const blockColorMap = new Map();
  filteredBlocks.forEach(block => {
    const key = `${block.color.r},${block.color.g},${block.color.b}`;
    if (!blockColorMap.has(key)) {
      blockColorMap.set(key, []);
    }
    blockColorMap.get(key).push(block);
  });

  // Traitement pixel par pixel optimisé
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    
    if (a < 128) {
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

// Algorithme optimisé de recherche du bloc le plus proche
function findNearestBlock(targetColor, availableBlocks) {
  let minDistance = Infinity;
  let bestBlock = availableBlocks[0];
  
  // Utilisation d'une boucle for classique pour de meilleures performances
  for (let i = 0; i < availableBlocks.length; i++) {
    const block = availableBlocks[i];
    const distance = colorDistance(targetColor, block.color);
    if (distance < minDistance) {
      minDistance = distance;
      bestBlock = block;
      
      // Optimisation : arrêt précoce si distance parfaite
      if (distance === 0) break;
    }
  }
  
  return bestBlock;
}

// Recherche optimisée de paires base+verre
function findNearestBlockPair(targetColor, availableBlocks, availableGlass) {
  let minDistance = Infinity;
  let bestBase = availableBlocks[0];
  let bestGlass = availableGlass.find(b => b.name === 'none');
  
  for (let i = 0; i < availableBlocks.length; i++) {
    const base = availableBlocks[i];
    
    // Test sans verre
    let distance = colorDistance(targetColor, base.color);
    if (distance < minDistance) {
      minDistance = distance;
      bestBase = base;
      bestGlass = availableGlass.find(b => b.name === 'none');
      
      if (distance === 0) return { base: bestBase, glass: bestGlass };
    }
    
    // Test avec chaque verre
    for (let j = 0; j < availableGlass.length; j++) {
      const glass = availableGlass[j];
      if (glass.name === 'none') continue;
      
      const blendedColor = blendColors(base.color, glass);
      distance = colorDistance(targetColor, blendedColor);
      if (distance < minDistance) {
        minDistance = distance;
        bestBase = base;
        bestGlass = glass;
        
        if (distance === 0) return { base: bestBase, glass: bestGlass };
      }
    }
  }
  
  return { base: bestBase, glass: bestGlass };
}

function blendColors(baseColor, glassBlock) {
  if (!glassBlock || glassBlock.name === 'none') return baseColor;
  const alpha = glassBlock.alpha || 0.5;
  return {
    r: Math.round((1 - alpha) * baseColor.r + alpha * glassBlock.color.r),
    g: Math.round((1 - alpha) * baseColor.g + alpha * glassBlock.color.g),
    b: Math.round((1 - alpha) * baseColor.b + alpha * glassBlock.color.b)
  };
}

// Distance de couleur optimisée
function colorDistance(c1, c2) {
  // Utilisation de la distance euclidienne pondérée pour une meilleure perception
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return dr * dr + dg * dg + db * db;
}

// Rendu optimisé du pixel art
function renderPixelArt(data, width, height) {
  hideProcessing();
  
  const pixelArt = document.getElementById('pixel-art');
  const placeholder = document.getElementById('pixel-art-placeholder');
  
  // Nettoyage efficace
  pixelArt.innerHTML = '';
  placeholder.classList.add('hidden');
  pixelArt.classList.remove('hidden');
  
  // Calcul de la taille optimale
  const maxSize = 735;
  const blockSize = Math.min(32, Math.floor(maxSize / Math.max(width, height)));
  
  // Configuration du grid
  pixelArt.style.display = 'grid';
  pixelArt.style.gridTemplateColumns = `repeat(${width}, ${blockSize}px)`;
  pixelArt.style.gridTemplateRows = `repeat(${height}, ${blockSize}px)`;
  pixelArt.style.width = `${width * blockSize}px`;
  pixelArt.style.height = `${height * blockSize}px`;
  
  // Fragment pour un rendu plus efficace
  const fragment = document.createDocumentFragment();
  
  data.forEach((pixelData) => {
    const div = document.createElement('div');
    div.className = 'pixel-square';
    div.style.width = `${blockSize}px`;
    div.style.height = `${blockSize}px`;
    div.style.position = 'relative';
    
    if (pixelData.transparent) {
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
    
    fragment.appendChild(div);
  });
  
  pixelArt.appendChild(fragment);
}

// Fonctions d'export sécurisées
function copyBlockList() {
  if (pixelArtData.length === 0) return;
  
  try {
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
      // Fallback pour les navigateurs plus anciens
      fallbackCopyToClipboard(blockList.join('\n'));
    });
  } catch (error) {
    console.error('Error creating block list:', error);
    alert('Failed to create block list');
  }
}

function fallbackCopyToClipboard(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.top = '-1000px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    alert('Block list copied to clipboard!');
  } catch (err) {
    alert('Failed to copy block list. Please copy manually.');
  }
  
  document.body.removeChild(textArea);
}

// Export schematic optimisé (reprise du code existant avec sécurité renforcée)
async function exportPixelArtToSchematic() {
  if (pixelArtData.length === 0) {
    alert('Please generate pixel art first!');
    return;
  }

  const width = parseInt(document.getElementById('width').value) || 32;
  const height = parseInt(document.getElementById('height').value) || 32;
  const useGlass = document.getElementById('glass-overlay').checked;

  try {
    // Validation des dimensions
    if (width > 128 || height > 128) {
      alert('Dimensions too large for export (max: 128x128)');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.TIMEOUT_MS);
    
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('assets/blocks.json', { signal: controller.signal }),
      fetch('assets/glass.json', { signal: controller.signal })
    ]);
    
    clearTimeout(timeoutId);
    
    if (!blocksResponse.ok || !glassResponse.ok) {
      throw new Error('Failed to load block data for export');
    }

    const palette = {};
    let paletteIndex = 0;
    
    palette["minecraft:air"] = paletteIndex++;
    
    function getPaletteIndex(name) {
      if (!(name in palette)) palette[name] = paletteIndex++;
      return palette[name];
    }

    const schematicWidth = width;
    const schematicHeight = useGlass ? 2 : 1;
    const schematicLength = height;
    const volume = schematicWidth * schematicHeight * schematicLength;
    const blockData = new Int32Array(volume).fill(0);

    let validBlocks = 0;
    pixelArtData.forEach((pixel, index) => {
      const x = index % width;
      const z = Math.floor(index / width);
      
      if (pixel.transparent) return;
      
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

    // Construction du NBT avec validation
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
                        "chromablock:web": {
                          type: "compound",
                          value: {
                            Name: { type: "string", value: "ChromaBlock-Web" },
                            Version: { type: "string", value: "1.0.0" }
                          }
                        }
                      }
                    },
                    EditingPlatform: { type: "string", value: "chromablock.web" },
                    Version: { type: "string", value: "1.0.0" },
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

    const nbtBuffer = writeNBT(nbtData);
    const compressed = pako.gzip(nbtBuffer);
    
    const blob = new Blob([compressed], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pixel_art.schem";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`.schem file exported successfully! ${validBlocks} blocks processed.`);
  } catch (err) {
    console.error('Export error:', err);
    alert("Export failed: " + err.message);
  }
}

// Fonctions NBT (reprises du code existant)
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

// Configuration des événements avec sécurité
function setupEventListeners() {
  // Événements avec debouncing pour éviter les appels multiples
  let processTimeout;
  
  document.getElementById('process-image').addEventListener('click', processImage);
  document.getElementById('copy-blocks').addEventListener('click', copyBlockList);
  document.getElementById('export-schematic').addEventListener('click', exportPixelArtToSchematic);
  
  // Debouncing pour les changements de dimensions
  function debounceProcess() {
    clearTimeout(processTimeout);
    processTimeout = setTimeout(() => {
      if (currentImage && pixelArtData.length > 0) {
        processImage();
      }
    }, 500);
  }
  
  document.getElementById('width').addEventListener('input', debounceProcess);
  document.getElementById('height').addEventListener('input', debounceProcess);
  
  // Changements immédiats pour les autres contrôles
  document.getElementById('black-white').addEventListener('change', () => {
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
  
  // Validation en temps réel des inputs numériques
  ['width', 'height'].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('input', (e) => {
      let value = parseInt(e.target.value);
      if (isNaN(value) || value < 8) {
        e.target.value = 8;
      } else if (value > 128) {
        e.target.value = 128;
      }
    });
  });
}

// Initialisation sécurisée
async function initializeApp() {
  try {
    console.log('Initializing ChromaBlock Pixel Art...');
    
    // Chargement des blocs avec gestion d'erreur
    await loadBlocks();
    
    // Configuration des composants
    setupUpload();
    setupEventListeners();
    updateButtonStates();
    
    console.log('ChromaBlock Pixel Art initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    alert('Failed to load application data. Please refresh the page.');
  }
}

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Ne pas exposer les détails d'erreur à l'utilisateur pour la sécurité
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// Point d'entrée sécurisé
document.addEventListener('DOMContentLoaded', initializeApp);