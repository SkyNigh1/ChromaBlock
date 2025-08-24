let blocks = [];
let glassBlocks = [];
let baseTL = null;
let baseTR = null;
let baseBL = null;
let baseBR = null;
let glassTL = null;
let glassTR = null;
let glassBL = null;
let glassBR = null;
let currentSource = null;
let fillMode = 'exact'; // Default to 'exact' (Accurate Colors)

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
    glassTL = glassTR = glassBL = glassBR = glassBlocks.find(b => b.name === 'none');
    document.getElementById('glassTL-label').textContent = 'None';
    document.getElementById('glassTR-label').textContent = 'None';
    document.getElementById('glassBL-label').textContent = 'None';
    document.getElementById('glassBR-label').textContent = 'None';
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
    div.innerHTML = block.name === 'none' ? `<span>${block.name}</span>` : `<img src="${block.path}" alt="${block.name}" title="${block.name}" />`;
    div.onclick = () => selectGlassBlock(block);
    glassContent.appendChild(div);
  });
}

function showColorPicker() {
  document.getElementById('blocks-content').classList.add('hidden');
  document.getElementById('glass-content').classList.add('hidden');
  document.getElementById('color-content').classList.remove('hidden');
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
  if (currentSource === 'baseTL') baseTL = block;
  else if (currentSource === 'baseTR') baseTR = block;
  else if (currentSource === 'baseBL') baseBL = block;
  else if (currentSource === 'baseBR') baseBR = block;
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
  if (currentSource === 'glassTL') glassTL = block;
  else if (currentSource === 'glassTR') glassTR = block;
  else if (currentSource === 'glassBL') glassBL = block;
  else if (currentSource === 'glassBR') glassBR = block;
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
  if (currentSource === 'baseTL') baseTL = colorObj;
  else if (currentSource === 'baseTR') baseTR = colorObj;
  else if (currentSource === 'baseBL') baseBL = colorObj;
  else if (currentSource === 'baseBR') baseBR = colorObj;
  else if (currentSource === 'glassTL') glassTL = colorObj;
  else if (currentSource === 'glassTR') glassTR = colorObj;
  else if (currentSource === 'glassBL') glassBL = colorObj;
  else glassBR = colorObj;
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
  if (!baseTL || !baseTR || !baseBL || !baseBR || !glassTL || !glassTR || !glassBL || !glassBR) return;
  const size = parseInt(document.getElementById('size').value) || 16;
  const viewMode = document.getElementById('view-mode').value;
  const gradient = document.getElementById('gradient');
  gradient.innerHTML = '';

  const gridSize = 735;
  const blockSize = gridSize / size;
  gradient.style.display = 'grid';
  gradient.style.gridTemplateColumns = `repeat(${size}, ${blockSize}px)`;
  gradient.style.gridTemplateRows = `repeat(${size}, ${blockSize}px)`;
  gradient.style.width = `${gridSize}px`;
  gradient.style.height = `${gridSize}px`;

  // Compute combined colors for each corner
  const tlColor = blendColors(baseTL.color, glassTL);
  const trColor = blendColors(baseTR.color, glassTR);
  const blColor = blendColors(baseBL.color, glassBL);
  const brColor = blendColors(baseBR.color, glassBR);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const u = j / (size - 1);
      const v = i / (size - 1);

      // Bilinear interpolation of combined colors
      const r = Math.round(
        (1 - u) * (1 - v) * tlColor.r +
        u * (1 - v) * trColor.r +
        (1 - u) * v * blColor.r +
        u * v * brColor.r
      );
      const g = Math.round(
        (1 - u) * (1 - v) * tlColor.g +
        u * (1 - v) * trColor.g +
        (1 - u) * v * blColor.g +
        u * v * brColor.g
      );
      const b = Math.round(
        (1 - u) * (1 - v) * tlColor.b +
        u * (1 - v) * trColor.b +
        (1 - u) * v * blColor.b +
        u * v * brColor.b
      );

      const finalColor = { r, g, b };
      const div = document.createElement('div');
      div.className = 'gradient-square';
      div.style.width = `${blockSize}px`;
      div.style.height = `${blockSize}px`;
      div.style.position = 'relative';

      if (fillMode === 'exact') {
        div.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        div.innerHTML = `<span class="tooltip">Color: rgb(${r}, ${g}, ${b})</span>`;
      } else {
        const { base, glass } = findNearestBlockPair(finalColor, viewMode);
        const baseImg = `<img src="${base.path}" alt="${base.name}" class="base-img" />`;
        const glassImg = glass.name !== 'none' ? `<img src="${glass.path}" alt="${glass.name}" class="glass-img" />` : '';
        const tooltip = glass.name === 'none' ? `Base: ${base.name}` : `Base: ${base.name}, Glass: ${glass.name}`;
        div.innerHTML = `${baseImg}${glassImg}<span class="tooltip">${tooltip}</span>`;
      }
      gradient.appendChild(div);
    }
  }
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
  fillMode = fillMode === 'exact' ? 'nearest' : 'exact';
  document.getElementById('fill-mode').textContent = fillMode === 'exact' ? 'Accurate Colors' : 'Close Blocks';
  updateGradient();
}

document.getElementById('tab-blocks').onclick = showBlocks;
document.getElementById('tab-glass').onclick = showGlassBlocks;
document.getElementById('tab-color').onclick = showColorPicker;
document.getElementById('close-modal').onclick = () => {
  document.getElementById('modal').classList.add('hidden');
};
document.getElementById('use-color').onclick = selectColor;
document.getElementById('size').oninput = updateGradient;
document.getElementById('fill-mode').onclick = toggleFillMode;
document.getElementById('view-mode').onchange = updateGradient;
document.getElementById('copy').onclick = () => {
  const gradient = document.getElementById('gradient');
  const names = Array.from(gradient.querySelectorAll('.tooltip')).map(span => span.textContent);
  navigator.clipboard.writeText(names.join(';'));
  alert('List copied!');
};
document.getElementById('surprise').onclick = () => {
  const viewMode = document.getElementById('view-mode').value;
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  const filteredGlass = glassBlocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0 || filteredGlass.length === 0) return;

  const randomBaseTL = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBaseTR = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBaseBL = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBaseBR = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomGlassTL = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
  const randomGlassTR = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
  const randomGlassBL = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
  const randomGlassBR = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];

  baseTL = randomBaseTL;
  document.getElementById('baseTL-img').src = randomBaseTL.path;
  document.getElementById('baseTL-img').classList.remove('hidden');
  document.getElementById('baseTL-label').textContent = randomBaseTL.name;

  baseTR = randomBaseTR;
  document.getElementById('baseTR-img').src = randomBaseTR.path;
  document.getElementById('baseTR-img').classList.remove('hidden');
  document.getElementById('baseTR-label').textContent = randomBaseTR.name;

  baseBL = randomBaseBL;
  document.getElementById('baseBL-img').src = randomBaseBL.path;
  document.getElementById('baseBL-img').classList.remove('hidden');
  document.getElementById('baseBL-label').textContent = randomBaseBL.name;

  baseBR = randomBaseBR;
  document.getElementById('baseBR-img').src = randomBaseBR.path;
  document.getElementById('baseBR-img').classList.remove('hidden');
  document.getElementById('baseBR-label').textContent = randomBaseBR.name;

  glassTL = randomGlassTL;
  document.getElementById('glassTL-img').src = randomGlassTL.path || '';
  document.getElementById('glassTL-img').classList[randomGlassTL.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassTL-label').textContent = randomGlassTL.name;

  glassTR = randomGlassTR;
  document.getElementById('glassTR-img').src = randomGlassTR.path || '';
  document.getElementById('glassTR-img').classList[randomGlassTR.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassTR-label').textContent = randomGlassTR.name;

  glassBL = randomGlassBL;
  document.getElementById('glassBL-img').src = randomGlassBL.path || '';
  document.getElementById('glassBL-img').classList[randomGlassBL.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassBL-label').textContent = randomGlassBL.name;

  glassBR = randomGlassBR;
  document.getElementById('glassBR-img').src = randomGlassBR.path || '';
  document.getElementById('glassBR-img').classList[randomGlassBR.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassBR-label').textContent = randomGlassBR.name;

  updateGradient();
};

// Initialize block loading
loadBlocks();