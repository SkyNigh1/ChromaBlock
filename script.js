let blocks = [];
let glassBlocks = [];
let sourceA = null;
let sourceB = null;
let glassA = null;
let glassB = null;
let currentSource = null;
let fillMode = 'nearest'; // Default to blocks (nearest)
let glassEnabled = false;

// Load blocks and glass from JSON files
async function loadBlocks() {
  try {
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('blocks.json'),
      fetch('glass.json')
    ]);
    blocks = await blocksResponse.json();
    glassBlocks = await glassResponse.json();
    
    // Initialize glass sources to "none"
    glassA = glassB = glassBlocks.find(b => b.name === 'none');
    document.getElementById('glassA-label').textContent = 'None';
    document.getElementById('glassB-label').textContent = 'None';
    
    showBlocks();
  } catch (error) {
    console.error('Error loading blocks or glass:', error);
  }
}

function openModal(source) {
  currentSource = source;
  document.getElementById('modal').classList.remove('hidden');
  
  if (source.startsWith('glass')) {
    showGlassBlocks();
  } else {
    showBlocks();
  }
}

function showBlocks() {
  const blocksContent = document.getElementById('blocks-content');
  const glassContent = document.getElementById('glass-content');
  blocksContent.classList.remove('hidden');
  glassContent.classList.add('hidden');
  document.getElementById('color-content').classList.add('hidden');
  
  // Update tabs
  document.getElementById('tab-blocks').classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-blocks').classList.remove('bg-gray-300', 'text-black');
  document.getElementById('tab-glass').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-glass').classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-color').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-color').classList.remove('bg-blue-600', 'text-white');

  blocksContent.innerHTML = '';
  blocks.forEach(block => {
    const div = document.createElement('div');
    div.className = 'block-option';
    div.innerHTML = `<img src="${block.path}" alt="${block.name}" title="${block.name}" />`;
    div.onclick = () => selectBlock(block);
    blocksContent.appendChild(div);
  });
}

function showGlassBlocks() {
  const blocksContent = document.getElementById('blocks-content');
  const glassContent = document.getElementById('glass-content');
  blocksContent.classList.add('hidden');
  glassContent.classList.remove('hidden');
  document.getElementById('color-content').classList.add('hidden');
  
  // Update tabs
  document.getElementById('tab-blocks').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-blocks').classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-glass').classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-glass').classList.remove('bg-gray-300', 'text-black');
  document.getElementById('tab-color').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-color').classList.remove('bg-blue-600', 'text-white');

  glassContent.innerHTML = '';
  glassBlocks.forEach(block => {
    const div = document.createElement('div');
    div.className = 'block-option';
    div.innerHTML = block.name === 'none' ? 
      `<span>${block.name}</span>` : 
      `<img src="${block.path}" alt="${block.name}" title="${block.name}" />`;
    div.onclick = () => selectGlassBlock(block);
    glassContent.appendChild(div);
  });
}

function showColorPicker() {
  document.getElementById('blocks-content').classList.add('hidden');
  document.getElementById('glass-content').classList.add('hidden');
  document.getElementById('color-content').classList.remove('hidden');
  
  // Update tabs
  document.getElementById('tab-blocks').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-blocks').classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-glass').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-glass').classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-color').classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-color').classList.remove('bg-gray-300', 'text-black');
}

function selectBlock(block) {
  const sourceId = currentSource;
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  img.src = block.path;
  img.classList.remove('hidden');
  label.textContent = block.name;
  
  if (currentSource === 'sourceA') sourceA = block;
  else if (currentSource === 'sourceB') sourceB = block;
  
  document.getElementById('modal').classList.add('hidden');
  updateGradient();
}

function selectGlassBlock(block) {
  const sourceId = currentSource;
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  img.src = block.path || '';
  img.classList[block.path ? 'remove' : 'add']('hidden');
  label.textContent = block.name;
  
  if (currentSource === 'glassA') glassA = block;
  else if (currentSource === 'glassB') glassB = block;
  
  document.getElementById('modal').classList.add('hidden');
  updateGradient();
}

function selectColor() {
  const color = document.getElementById('color-picker').value;
  const sourceId = currentSource;
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  img.src = '';
  img.classList.add('hidden');
  label.textContent = `Color: ${color}`;
  
  const colorObj = { 
    name: color, 
    color: hexToRgb(color), 
    path: null, 
    view: 'both',
    alpha: currentSource.startsWith('glass') ? 0.5 : 1.0
  };
  
  if (currentSource === 'sourceA') sourceA = colorObj;
  else if (currentSource === 'sourceB') sourceB = colorObj;
  else if (currentSource === 'glassA') glassA = colorObj;
  else if (currentSource === 'glassB') glassB = colorObj;
  
  document.getElementById('modal').classList.add('hidden');
  updateGradient();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function blendColors(baseColor, glassBlock) {
  if (!glassBlock || glassBlock.name === 'none') return baseColor;
  const alpha = glassBlock.alpha || 0.5;
  const r = Math.round((1 - alpha) * baseColor.r + alpha * glassBlock.color.r);
  const g = Math.round((1 - alpha) * baseColor.g + alpha * glassBlock.color.g);
  const b = Math.round((1 - alpha) * baseColor.b + alpha * glassBlock.color.b);
  return { r, g, b };
}

function updateGradient() {
  if (!sourceA || !sourceB) return;
  
  const length = parseInt(document.getElementById('length').value) || 16;
  const viewMode = document.getElementById('view-mode').value;
  const gradient = document.getElementById('gradient');
  gradient.innerHTML = '';

  for (let i = 0; i < length; i++) {
    const t = length === 1 ? 0 : i / (length - 1);
    
    const div = document.createElement('div');
    div.className = 'gradient-square';
    
    if (fillMode === 'exact') {
      // Mode couleur exacte - interpolation simple
      const baseR = Math.round(sourceA.color.r + (sourceB.color.r - sourceA.color.r) * t);
      const baseG = Math.round(sourceA.color.g + (sourceB.color.g - sourceA.color.g) * t);
      const baseB = Math.round(sourceA.color.b + (sourceB.color.b - sourceA.color.b) * t);
      
      let finalColor = { r: baseR, g: baseG, b: baseB };
      
      // Apply glass blending if enabled
      if (glassEnabled && glassA && glassB) {
        const glassAColor = glassA.name === 'none' ? null : glassA.color;
        const glassBColor = glassB.name === 'none' ? null : glassB.color;
        
        if (glassAColor && glassBColor) {
          const glassR = Math.round(glassAColor.r + (glassBColor.r - glassAColor.r) * t);
          const glassG = Math.round(glassAColor.g + (glassBColor.g - glassAColor.g) * t);
          const glassB = Math.round(glassAColor.b + (glassBColor.b - glassAColor.b) * t);
          const interpolatedGlass = { 
            color: { r: glassR, g: glassG, b: glassB }, 
            alpha: 0.5, 
            name: 'interpolated' 
          };
          finalColor = blendColors(finalColor, interpolatedGlass);
        } else if (glassAColor) {
          const alpha = (1 - t) * 0.5;
          const interpolatedGlass = { color: glassAColor, alpha: alpha, name: 'interpolated' };
          finalColor = blendColors(finalColor, interpolatedGlass);
        } else if (glassBColor) {
          const alpha = t * 0.5;
          const interpolatedGlass = { color: glassBColor, alpha: alpha, name: 'interpolated' };
          finalColor = blendColors(finalColor, interpolatedGlass);
        }
      }
      
      div.style.backgroundColor = `rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})`;
      
      // Créer le tooltip pour l'exportation
      const tooltip = document.createElement('span');
      tooltip.className = 'tooltip';
      tooltip.textContent = `Color: rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})`;
      div.appendChild(tooltip);
      
    } else {
      // Mode blocs - CORRECTION 2: Gérer les extrémités correctement
      if (glassEnabled) {
        let baseBlock, glassBlock;
        
        // CORRECTION: Forcer les sources sélectionnées aux extrémités
        if (i === 0) {
          // Premier bloc : utiliser sourceA et glassA
          baseBlock = sourceA.path ? sourceA : findNearestBlock(sourceA.color, viewMode);
          glassBlock = glassA;
        } else if (i === length - 1) {
          // Dernier bloc : utiliser sourceB et glassB
          baseBlock = sourceB.path ? sourceB : findNearestBlock(sourceB.color, viewMode);
          glassBlock = glassB;
        } else {
          // Blocs intermédiaires : interpolation et recherche du meilleur match
          const baseR = Math.round(sourceA.color.r + (sourceB.color.r - sourceA.color.r) * t);
          const baseG = Math.round(sourceA.color.g + (sourceB.color.g - sourceA.color.g) * t);
          const baseB = Math.round(sourceA.color.b + (sourceB.color.b - sourceA.color.b) * t);
          
          let targetColor = { r: baseR, g: baseG, b: baseB };
          
          // Interpoler le verre aussi
          const glassAColor = glassA.name === 'none' ? null : glassA.color;
          const glassBColor = glassB.name === 'none' ? null : glassB.color;
          
          if (glassAColor && glassBColor) {
            const glassR = Math.round(glassAColor.r + (glassBColor.r - glassAColor.r) * t);
            const glassG = Math.round(glassAColor.g + (glassBColor.g - glassAColor.g) * t);
            const glassB = Math.round(glassAColor.b + (glassBColor.b - glassAColor.b) * t);
            const interpolatedGlass = { 
              color: { r: glassR, g: glassG, b: glassB }, 
              alpha: 0.5, 
              name: 'interpolated' 
            };
            targetColor = blendColors(targetColor, interpolatedGlass);
          }
          
          const result = findNearestBlockPair(targetColor, viewMode);
          baseBlock = result.base;
          glassBlock = result.glass;
        }
        
        const baseImg = `<img src="${baseBlock.path}" alt="${baseBlock.name}" class="base-img" />`;
        const glassImg = glassBlock.name !== 'none' ? `<img src="${glassBlock.path}" alt="${glassBlock.name}" class="glass-img" />` : '';
        
        // Créer le tooltip pour l'exportation avec les noms corrects des blocs
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = glassBlock.name === 'none' ? `Base: ${baseBlock.name}` : `Base: ${baseBlock.name}, Glass: ${glassBlock.name}`;
        
        div.innerHTML = baseImg + glassImg;
        div.appendChild(tooltip);
        
      } else {
        // Mode sans verre
        let nearestBlock;
        
        // CORRECTION: Forcer les sources sélectionnées aux extrémités
        if (i === 0) {
          // Premier bloc : utiliser sourceA
          nearestBlock = sourceA.path ? sourceA : findNearestBlock(sourceA.color, viewMode);
        } else if (i === length - 1) {
          // Dernier bloc : utiliser sourceB
          nearestBlock = sourceB.path ? sourceB : findNearestBlock(sourceB.color, viewMode);
        } else {
          // Blocs intermédiaires : interpolation
          const baseR = Math.round(sourceA.color.r + (sourceB.color.r - sourceA.color.r) * t);
          const baseG = Math.round(sourceA.color.g + (sourceB.color.g - sourceA.color.g) * t);
          const baseB = Math.round(sourceA.color.b + (sourceB.color.b - sourceA.color.b) * t);
          const finalColor = { r: baseR, g: baseG, b: baseB };
          
          nearestBlock = findNearestBlock(finalColor, viewMode);
        }
        
        const img = `<img src="${nearestBlock.path}" alt="${nearestBlock.name}" />`;
        
        // Créer le tooltip pour l'exportation
        const tooltip = document.createElement('span');
        tooltip.className = 'tooltip';
        tooltip.textContent = `Base: ${nearestBlock.name}`;
        
        div.innerHTML = img;
        div.appendChild(tooltip);
      }
    }
    gradient.appendChild(div);
  }

  // Mettre à jour l'input size pour l'exportation
  updateSizeInput();
}

// Nouvelle fonction pour synchroniser l'input size avec la longueur du gradient
function updateSizeInput() {
  const length = parseInt(document.getElementById('length').value) || 16;
  let sizeInput = document.getElementById('size');
  if (!sizeInput) {
    // Créer l'input size s'il n'existe pas (pour l'exportation)
    sizeInput = document.createElement('input');
    sizeInput.id = 'size';
    sizeInput.type = 'hidden';
    document.body.appendChild(sizeInput);
  }
  sizeInput.value = length;
}

function findNearestBlock(color, viewMode) {
  let minDistance = Infinity;
  let nearestBlock = blocks[0];
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0) return blocks[0];
  
  filteredBlocks.forEach(block => {
    const distance =
      Math.pow(block.color.r - color.r, 2) +
      Math.pow(block.color.g - color.g, 2) +
      Math.pow(block.color.b - color.b, 2);
    if (distance < minDistance) {
      minDistance = distance;
      nearestBlock = block;
    }
  });
  return nearestBlock;
}

function findNearestBlockPair(targetColor, viewMode) {
  let minDistance = Infinity;
  let bestBase = blocks[0];
  let bestGlass = glassBlocks.find(b => b.name === 'none');
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  const filteredGlass = glassBlocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0) return { base: blocks[0], glass: bestGlass };

  filteredBlocks.forEach(base => {
    // Try with no glass
    let distance = 
      Math.pow(base.color.r - targetColor.r, 2) +
      Math.pow(base.color.g - targetColor.g, 2) +
      Math.pow(base.color.b - targetColor.b, 2);
    if (distance < minDistance) {
      minDistance = distance;
      bestBase = base;
      bestGlass = filteredGlass.find(b => b.name === 'none');
    }

    // Try with each glass block
    filteredGlass.forEach(glass => {
      if (glass.name === 'none') return;
      const blendedColor = blendColors(base.color, glass);
      distance = 
        Math.pow(blendedColor.r - targetColor.r, 2) +
        Math.pow(blendedColor.g - targetColor.g, 2) +
        Math.pow(blendedColor.b - targetColor.b, 2);
      if (distance < minDistance) {
        minDistance = distance;
        bestBase = base;
        bestGlass = glass;
      }
    });
  });

  return { base: bestBase, glass: bestGlass };
}

function toggleFillMode() {
  fillMode = fillMode === 'nearest' ? 'exact' : 'nearest';
  document.getElementById('fill-mode').textContent = fillMode === 'nearest' ? 'Close Blocks' : 'Accurate Colors';
  updateGradient();
}

function toggleGlassOverlay() {
  glassEnabled = document.getElementById('enable-glass').checked;
  const glassSources = document.getElementById('glass-sources');
  
  if (glassEnabled) {
    glassSources.classList.remove('hidden');
  } else {
    glassSources.classList.add('hidden');
  }
  
  updateGradient();
}

// Event listeners
document.getElementById('tab-blocks').onclick = showBlocks;
document.getElementById('tab-glass').onclick = showGlassBlocks;
document.getElementById('tab-color').onclick = showColorPicker;
document.getElementById('close-modal').onclick = () => {
  document.getElementById('modal').classList.add('hidden');
};
document.getElementById('use-color').onclick = selectColor;
document.getElementById('length').oninput = updateGradient;
document.getElementById('fill-mode').onclick = toggleFillMode;
document.getElementById('view-mode').onchange = updateGradient;
document.getElementById('enable-glass').onchange = toggleGlassOverlay;

document.getElementById('copy').onclick = () => {
  const gradient = document.getElementById('gradient');
  const names = Array.from(gradient.querySelectorAll('.tooltip')).map(span => span.textContent);
  navigator.clipboard.writeText(names.join(','));
  alert('List copied!');
};

document.getElementById('surprise').onclick = () => {
  const viewMode = document.getElementById('view-mode').value;
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  const filteredGlass = glassBlocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0) return;
  
  const randomA = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomB = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  
  sourceA = randomA;
  document.getElementById('sourceA-img').src = randomA.path;
  document.getElementById('sourceA-img').classList.remove('hidden');
  document.getElementById('sourceA-label').textContent = randomA.name;
  
  sourceB = randomB;
  document.getElementById('sourceB-img').src = randomB.path;
  document.getElementById('sourceB-img').classList.remove('hidden');
  document.getElementById('sourceB-label').textContent = randomB.name;
  
  if (glassEnabled && filteredGlass.length > 0) {
    const randomGlassA = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
    const randomGlassB = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
    
    glassA = randomGlassA;
    document.getElementById('glassA-img').src = randomGlassA.path || '';
    document.getElementById('glassA-img').classList[randomGlassA.path ? 'remove' : 'add']('hidden');
    document.getElementById('glassA-label').textContent = randomGlassA.name;
    
    glassB = randomGlassB;
    document.getElementById('glassB-img').src = randomGlassB.path || '';
    document.getElementById('glassB-img').classList[randomGlassB.path ? 'remove' : 'add']('hidden');
    document.getElementById('glassB-label').textContent = randomGlassB.name;
  }
  
  updateGradient();
};

// Initialize block loading
loadBlocks();