// Pixel Art Creator - Version améliorée avec cybersécurité et optimisations

let blocks = [];
let glassBlocks = [];
let currentImage = null;
let pixelArtData = [];

// Security: Input validation constants
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const MAX_DIMENSION = 4096; // Maximum image dimension

// Block entities to avoid when "Remove Block Entities" is checked
const blockEntities = new Set([
  'banner', 'barrel', 'barrel[facing=up]', 'barrel[facing=up,open=true]', 'barrel[facing=down]',
  'beacon', 'bed', 'beehive', 'bell', 'blast_furnace', 'brewing_stand', 'brushable_block',
  'calibrated_sculk_sensor', 'campfire', 'chest', 'chiseled_bookshelf', 'command_block',
  'comparator', 'conduit', 'crafter', 'creaking_heart', 'daylight_detector', 'decorated_pot',
  'dispenser', 'dropper', 'enchanting_table', 'end_gateway', 'end_portal', 'ender_chest',
  'furnace', 'hanging_sign', 'hopper', 'jigsaw', 'jukebox', 'lectern', 'mob_spawner',
  'piston', 'piston[facing=up]', 'sculk_catalyst', 'sculk_sensor', 'sculk_shrieker',
  'shulker_box', 'sign', 'skull', 'smoker', 'structure_block', 'trapped_chest',
  'trial_spawner', 'trial_spawner[ominous=true]', 'vault', 'vault[ominous=true]'
]);

// Security: Sanitize input values
function sanitizeNumericInput(value, min = 1, max = 1024) {
  const num = parseInt(value);
  if (isNaN(num) || num < min || num > max) {
    throw new Error(`Invalid numeric input: ${value}. Must be between ${min} and ${max}.`);
  }
  return num;
}

// Security: Validate file type and size
function validateFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }
  
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only PNG, JPG, JPEG, GIF, and WEBP are allowed.');
  }
  
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }
  
  return true;
}

// Security: Validate image dimensions
function validateImageDimensions(img) {
  if (img.naturalWidth > MAX_DIMENSION || img.naturalHeight > MAX_DIMENSION) {
    throw new Error(`Image dimensions too large. Maximum is ${MAX_DIMENSION}x${MAX_DIMENSION} pixels.`);
  }
  
  if (img.naturalWidth === 0 || img.naturalHeight === 0) {
    throw new Error('Invalid image dimensions.');
  }
  
  return true;
}

// Optimized color distance calculation using squared Euclidean distance
function colorDistance(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return dr * dr + dg * dg + db * db; // No need for Math.sqrt for comparison
}

// Optimized block finding with spatial indexing and caching
class BlockMatcher {
  constructor(blocks, glassBlocks) {
    this.blocks = blocks;
    this.glassBlocks = glassBlocks;
    this.colorCache = new Map();
    this.indexedBlocks = this.buildColorIndex(blocks);
    this.indexedGlass = this.buildColorIndex(glassBlocks);
  }

  // Build spatial color index for faster lookups
  buildColorIndex(blocks) {
    const index = new Map();
    const bucketSize = 32; // Color space buckets
    
    blocks.forEach(block => {
      const r = Math.floor(block.color.r / bucketSize);
      const g = Math.floor(block.color.g / bucketSize);
      const b = Math.floor(block.color.b / bucketSize);
      const key = `${r},${g},${b}`;
      
      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key).push(block);
    });
    
    return index;
  }

  // Get candidate blocks from nearby color buckets
  getCandidateBlocks(targetColor, indexedBlocks) {
    const bucketSize = 32;
    const candidates = new Set();
    
    const r = Math.floor(targetColor.r / bucketSize);
    const g = Math.floor(targetColor.g / bucketSize);
    const b = Math.floor(targetColor.b / bucketSize);
    
    // Check current bucket and adjacent buckets
    for (let dr = -1; dr <= 1; dr++) {
      for (let dg = -1; dg <= 1; dg++) {
        for (let db = -1; db <= 1; db++) {
          const key = `${r + dr},${g + dg},${b + db}`;
          const blocks = indexedBlocks.get(key);
          if (blocks) {
            blocks.forEach(block => candidates.add(block));
          }
        }
      }
    }
    
    return Array.from(candidates);
  }

  findNearestBlock(targetColor, availableBlocks) {
    const colorKey = `${targetColor.r},${targetColor.g},${targetColor.b}`;
    
    if (this.colorCache.has(colorKey)) {
      return this.colorCache.get(colorKey);
    }

    const candidates = this.getCandidateBlocks(targetColor, this.indexedBlocks);
    const validCandidates = candidates.filter(block => availableBlocks.includes(block));
    
    if (validCandidates.length === 0) {
      return availableBlocks[0]; // Fallback
    }

    let minDistance = Infinity;
    let bestBlock = validCandidates[0];
    
    for (const block of validCandidates) {
      const distance = colorDistance(targetColor, block.color);
      if (distance < minDistance) {
        minDistance = distance;
        bestBlock = block;
        if (distance === 0) break; // Perfect match
      }
    }
    
    this.colorCache.set(colorKey, bestBlock);
    return bestBlock;
  }

  findNearestBlockPair(targetColor, availableBlocks, availableGlass) {
    const colorKey = `${targetColor.r},${targetColor.g},${targetColor.b}_pair`;
    
    if (this.colorCache.has(colorKey)) {
      return this.colorCache.get(colorKey);
    }

    let minDistance = Infinity;
    let bestBase = availableBlocks[0];
    let bestGlass = availableGlass.find(b => b.name === 'none');
    
    const baseCandidates = this.getCandidateBlocks(targetColor, this.indexedBlocks);
    const validBaseCandidates = baseCandidates.filter(block => availableBlocks.includes(block));
    
    for (const base of validBaseCandidates) {
      // Try with no glass first
      let distance = colorDistance(targetColor, base.color);
      if (distance < minDistance) {
        minDistance = distance;
        bestBase = base;
        bestGlass = availableGlass.find(b => b.name === 'none');
        if (distance === 0) break; // Perfect match
      }
      
      // Try with glass blocks (only check most promising ones)
      for (const glass of availableGlass) {
        if (glass.name === 'none') continue;
        
        const blendedColor = this.blendColors(base.color, glass);
        distance = colorDistance(targetColor, blendedColor);
        
        if (distance < minDistance) {
          minDistance = distance;
          bestBase = base;
          bestGlass = glass;
          if (distance === 0) break; // Perfect match
        }
      }
      
      if (minDistance === 0) break; // Perfect match found
    }
    
    const result = { base: bestBase, glass: bestGlass };
    this.colorCache.set(colorKey, result);
    return result;
  }

  blendColors(baseColor, glassBlock) {
    if (!glassBlock || glassBlock.name === 'none') return baseColor;
    
    const alpha = glassBlock.alpha || 0.5;
    const invAlpha = 1 - alpha;
    
    return {
      r: Math.round(invAlpha * baseColor.r + alpha * glassBlock.color.r),
      g: Math.round(invAlpha * baseColor.g + alpha * glassBlock.color.g),
      b: Math.round(invAlpha * baseColor.b + alpha * glassBlock.color.b)
    };
  }
}

// Load blocks and glass from JSON files with error handling
async function loadBlocks() {
  try {
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('assets/blocks.json'),
      fetch('assets/glass.json')
    ]);
    
    if (!blocksResponse.ok) {
      throw new Error(`Failed to load blocks.json: ${blocksResponse.status}`);
    }
    if (!glassResponse.ok) {
      throw new Error(`Failed to load glass.json: ${glassResponse.status}`);
    }
    
    blocks = await blocksResponse.json();
    glassBlocks = await glassResponse.json();
    
    // Security: Validate loaded data structure
    if (!Array.isArray(blocks) || !Array.isArray(glassBlocks)) {
      throw new Error('Invalid data format in JSON files');
    }
    
    console.log(`Loaded ${blocks.length} blocks and ${glassBlocks.length} glass blocks`);
  } catch (error) {
    console.error('Error loading blocks or glass:', error);
    alert('Error loading block data. Please refresh the page and try again.');
  }
}

// Enhanced upload handling with security checks
function setupUpload() {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const imagePreview = document.getElementById('image-preview');
  const previewImg = document.getElementById('preview-img');
  const imageDimensions = document.getElementById('image-dimensions');
  const clearBtn = document.getElementById('clear-image');

  // Click to upload
  uploadArea.addEventListener('click', () => fileInput.click());

  // Enhanced drag and drop with security
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

  // File input change with validation
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  // Clear image
  clearBtn.addEventListener('click', clearImage);
}

// Enhanced file handling with comprehensive security checks
function handleFile(file) {
  try {
    validateFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          validateImageDimensions(img);
          currentImage = img;
          showImagePreview(img, file);
          updateButtonStates();
        } catch (error) {
          console.error('Image validation error:', error);
          alert(error.message);
        }
      };
      img.onerror = () => {
        alert('Failed to load image. Please try a different file.');
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error('File validation error:', error);
    alert(error.message);
  }
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

// Optimized image processing with smart cropping and grayscale support
function processImage() {
  if (!currentImage) return;

  try {
    const width = sanitizeNumericInput(document.getElementById('width').value, 1, 1024);
    const height = sanitizeNumericInput(document.getElementById('height').value, 1, 1024);
    const viewMode = document.getElementById('view-mode').value;
    const useGlass = document.getElementById('glass-overlay').checked;
    const useGrayscale = document.getElementById('grayscale').checked;

    showProcessing();

    // Use requestAnimationFrame for better performance
    requestAnimationFrame(() => {
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
        
        // Use high-quality scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw cropped and resized image
        ctx.drawImage(
          currentImage,
          sourceX, sourceY, sourceWidth, sourceHeight,
          0, 0, width, height
        );
        
        const imageData = ctx.getImageData(0, 0, width, height);
        
        // Apply grayscale filter if selected
        if (useGrayscale) {
          applyGrayscale(imageData);
        }
        
        // Convert to blocks with optimized algorithm
        pixelArtData = convertToBlocks(imageData, viewMode, useGlass);
        
        // Render pixel art
        renderPixelArt(pixelArtData, width, height);
        updateButtonStates();
      } catch (error) {
        console.error('Error processing image:', error);
        alert('Error processing image: ' + error.message);
        hideProcessing();
      }
    });
  } catch (error) {
    console.error('Invalid input:', error);
    alert(error.message);
    hideProcessing();
  }
}

// Optimized grayscale conversion
function applyGrayscale(imageData) {
  const data = imageData.data;
  
  // Use luminance formula for better grayscale conversion
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // ITU-R BT.709 luma coefficients for better perceived brightness
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    data[i] = gray;     // Red
    data[i + 1] = gray; // Green
    data[i + 2] = gray; // Blue
    // Alpha remains unchanged
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

// Optimized block conversion with enhanced filtering
function convertToBlocks(imageData, viewMode, useGlass) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const result = [];
  const removeBlockEntities = document.getElementById('remove-blockentities').checked;
  
  // Filter blocks based on view mode and block entities
  let filteredBlocks = blocks.filter(block => {
    const viewMatch = viewMode === 'both' || block.view === viewMode || block.view === 'both';
    const entityMatch = !removeBlockEntities || !blockEntities.has(block.name);
    return viewMatch && entityMatch;
  });
  
  const filteredGlass = glassBlocks.filter(block => 
    viewMode === 'both' || block.view === viewMode || block.view === 'both'
  );
  
  if (filteredBlocks.length === 0) {
    throw new Error('No blocks available for selected view mode and filters');
  }

  // Create optimized block matcher
  const matcher = new BlockMatcher(filteredBlocks, filteredGlass);

  // Process pixels in chunks for better performance
  const chunkSize = 1000;
  for (let start = 0; start < data.length; start += chunkSize * 4) {
    const end = Math.min(start + chunkSize * 4, data.length);
    
    for (let i = start; i < end; i += 4) {
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
          const { base, glass } = matcher.findNearestBlockPair(targetColor, filteredBlocks, filteredGlass);
          result.push({ base, glass, color: targetColor, transparent: false });
        } else {
          const base = matcher.findNearestBlock(targetColor, filteredBlocks);
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

function renderPixelArt(data, width, height) {
  hideProcessing();
  
  const pixelArt = document.getElementById('pixel-art');
  const placeholder = document.getElementById('pixel-art-placeholder');
  
  pixelArt.innerHTML = '';
  placeholder.classList.add('hidden');
  pixelArt.classList.remove('hidden');
  
  // Calculate block size to fit in container with maximum size limit
  const maxSize = 800;
  const blockSize = Math.min(32, Math.floor(maxSize / Math.max(width, height)));
  
  pixelArt.style.display = 'grid';
  pixelArt.style.gridTemplateColumns = `repeat(${width}, ${blockSize}px)`;
  pixelArt.style.gridTemplateRows = `repeat(${height}, ${blockSize}px)`;
  pixelArt.style.width = `${width * blockSize}px`;
  pixelArt.style.height = `${height * blockSize}px`;
  
  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  data.forEach((pixelData, index) => {
    const div = document.createElement('div');
    div.className = 'pixel-square';
    div.style.width = `${blockSize}px`;
    div.style.height = `${blockSize}px`;
    div.style.position = 'relative';
    
    if (pixelData.transparent) {
      // Transparent pixel - use air block or checkerboard pattern
      div.style.background = 'repeating-conic-gradient(#444 0% 25%, transparent 0% 50%) 50% / 8px 8px';
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

// Enhanced export functions with error handling
function copyBlockList() {
  try {
    if (pixelArtData.length === 0) {
      alert('No pixel art data to copy. Please process an image first.');
      return;
    }
    
    const blockList = pixelArtData.map(pixel => {
      if (pixel.transparent) return 'Air';
      if (pixel.glass && pixel.glass.name !== 'none') {
        return `Base: ${pixel.base.name}, Glass: ${pixel.glass.name}`;
      }
      return `Base: ${pixel.base.name}`;
    });
    
    navigator.clipboard.writeText(blockList.join('\n')).then(() => {
      alert('Block list copied to clipboard successfully!');
    }).catch(err => {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = blockList.join('\n');
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Block list copied to clipboard!');
    });
  } catch (error) {
    console.error('Error copying block list:', error);
    alert('Failed to copy block list: ' + error.message);
  }
}

// Enhanced schematic export using exportSchematic.js functions
async function exportPixelArtToSchematic() {
  if (pixelArtData.length === 0) {
    alert('Please generate pixel art first!');
    return;
  }

  try {
    const width = sanitizeNumericInput(document.getElementById('width').value, 1, 1024);
    const height = sanitizeNumericInput(document.getElementById('height').value, 1, 1024);
    const useGlass = document.getElementById('glass-overlay').checked;

    // Load blocks and glass data with error handling
    let blocksData, glassData;
    try {
      const [blocksResponse, glassResponse] = await Promise.all([
        fetch('assets/blocks.json'),
        fetch('assets/glass.json')
      ]);
      
      if (!blocksResponse.ok || !glassResponse.ok) {
        throw new Error('Failed to fetch block data');
      }
      
      blocksData = await blocksResponse.json();
      glassData = await glassResponse.json();
    } catch (err) {
      alert("Error loading blocks.json / glass.json: " + err.message);
      return;
    }

    // Create palette
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
        return; // Leave as air
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

    // Create NBT data structure
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

    // Use functions from exportSchematic.js
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
    alert(`.schem v3 exported successfully! ${validBlocks} blocks processed.`);
  } catch (error) {
    console.error('Export error:', error);
    alert("Export failed: " + error.message);
  }
}

// Enhanced event listeners with error handling
function setupEventListeners() {
  try {
    document.getElementById('process-image').addEventListener('click', processImage);
    document.getElementById('copy-blocks').addEventListener('click', copyBlockList);
    document.getElementById('export-schematic').addEventListener('click', exportPixelArtToSchematic);
    
    // Auto-regenerate with debouncing
    let debounceTimer;
    const debouncedProcess = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (currentImage && pixelArtData.length > 0) {
          processImage();
        }
      }, 500);
    };

    document.getElementById('width').addEventListener('input', debouncedProcess);
    document.getElementById('height').addEventListener('input', debouncedProcess);
    document.getElementById('view-mode').addEventListener('change', () => {
      if (currentImage) processImage();
    });
    document.getElementById('glass-overlay').addEventListener('change', () => {
      if (currentImage) processImage();
    });
    document.getElementById('grayscale').addEventListener('change', () => {
      if (currentImage) processImage();
    });
    document.getElementById('remove-blockentities').addEventListener('change', () => {
      if (currentImage) processImage();
    });
  } catch (error) {
    console.error('Error setting up event listeners:', error);
  }
}

// Initialize everything with error handling
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadBlocks();
    setupUpload();
    setupEventListeners();
    updateButtonStates();
  } catch (error) {
    console.error('Initialization error:', error);
    alert('Failed to initialize the application. Please refresh the page.');
  }
});