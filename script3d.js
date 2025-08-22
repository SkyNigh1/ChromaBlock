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

// Load blocks and glass from JSON files
async function loadBlocks() {
  try {
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('blocks.json'),
      fetch('glass.json')
    ]);
    blocks = await blocksResponse.json();
    glassBlocks = await glassResponse.json();
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
    div.innerHTML = `<img src="${block.path}" alt="${block.name}" title="${block.name}" />`;
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
  img.src = block.path;
  img.classList.remove('hidden');
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
  const colorObj = { name: color, color: hexToRgb(color), path: null, view: 'both', alpha: currentSource.startsWith('glass') ? 0.5 : 1.0 };
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

function blendColors(baseColor, glassColor) {
  const alpha = glassColor.alpha || 0.5; // Default alpha for glass
  const r = Math.round((1 - alpha) * baseColor.r + alpha * glassColor.r);
  const g = Math.round((1 - alpha) * baseColor.g + alpha * glassColor.g);
  const b = Math.round((1 - alpha) * baseColor.b + alpha * glassColor.b);
  return { r, g, b };
}

function updateGradient() {
  if (!baseTL || !baseTR || !baseBL || !baseBR || !glassTL || !glassTR || !glassBL || !glassBR) return;
  const size = parseInt(document.getElementById('size').value) || 16;
  const fillMode = document.getElementById('fill-mode').value;
  const viewMode = document.getElementById('view-mode').value;
  const gradient = document.getElementById('gradient');
  gradient.innerHTML = '';

  const gridSize = 512;
  const blockSize = gridSize / size;
  gradient.style.display = 'grid';
  gradient.style.gridTemplateColumns = `repeat(${size}, ${blockSize}px)`;
  gradient.style.gridTemplateRows = `repeat(${size}, ${blockSize}px)`;
  gradient.style.width = `${gridSize}px`;
  gradient.style.height = `${gridSize}px`;

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      const u = j / (size - 1);
      const v = i / (size - 1);

      // Bilinear interpolation for base block
      const baseR = Math.round(
        (1 - u) * (1 - v) * baseTL.color.r +
        u * (1 - v) * baseTR.color.r +
        (1 - u) * v * baseBL.color.r +
        u * v * baseBR.color.r
      );
      const baseG = Math.round(
        (1 - u) * (1 - v) * baseTL.color.g +
        u * (1 - v) * baseTR.color.g +
        (1 - u) * v * baseBL.color.g +
        u * v * baseBR.color.g
      );
      const baseB = Math.round(
        (1 - u) * (1 - v) * baseTL.color.b +
        u * (1 - v) * baseTR.color.b +
        (1 - u) * v * baseBL.color.b +
        u * v * baseBR.color.b
      );

      // Bilinear interpolation for glass block
      const glassR = Math.round(
        (1 - u) * (1 - v) * glassTL.color.r +
        u * (1 - v) * glassTR.color.r +
        (1 - u) * v * glassBL.color.r +
        u * v * glassBR.color.r
      );
      const glassG = Math.round(
        (1 - u) * (1 - v) * glassTL.color.g +
        u * (1 - v) * glassTR.color.g +
        (1 - u) * v * glassBL.color.g +
        u * v * glassBR.color.g
      );
      const glassB = Math.round(
        (1 - u) * (1 - v) * glassTL.color.b +
        u * (1 - v) * glassTR.color.b +
        (1 - u) * v * glassBL.color.b +
        u * v * glassBR.color.b
      );

      const baseColor = { r: baseR, g: baseG, b: baseB };
      const glassColor = { r: glassR, g: glassG, b: glassB, alpha: glassTL.alpha || 0.5 };
      const finalColor = blendColors(baseColor, glassColor);

      const div = document.createElement('div');
      div.className = 'gradient-square';
      div.style.width = `${blockSize}px`;
      div.style.height = `${blockSize}px`;
      div.style.position = 'relative';

      if (fillMode === 'exact') {
        div.style.backgroundColor = `rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})`;
        div.innerHTML = `<span class="tooltip">Color: rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})</span>`;
      } else {
        const nearestBase = findNearestBlock(baseColor, viewMode);
        const nearestGlass = findNearestGlass(glassColor, viewMode);
        div.innerHTML = `
          <img src="${nearestBase.path}" alt="${nearestBase.name}" class="base-img" />
          <img src="${nearestGlass.path}" alt="${nearestGlass.name}" class="glass-img" />
          <span class="tooltip">Base: ${nearestBase.name}, Glass: ${nearestGlass.name}</span>`;
      }
      gradient.appendChild(div);
    }
  }
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

function findNearestGlass(color, viewMode) {
  let minDistance = Infinity;
  let nearestGlass = glassBlocks[0];
  const filteredGlass = glassBlocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredGlass.length === 0) return glassBlocks[0];
  filteredGlass.forEach(block => {
    const distance =
      Math.pow(block.color.r - color.r, 2) +
      Math.pow(block.color.g - color.g, 2) +
      Math.pow(block.color.b - color.b, 2);
    if (distance < minDistance) {
      minDistance = distance;
      nearestGlass = block;
    }
  });
  return nearestGlass;
}

document.getElementById('tab-blocks').onclick = showBlocks;
document.getElementById('tab-glass').onclick = showGlassBlocks;
document.getElementById('tab-color').onclick = showColorPicker;
document.getElementById('close-modal').onclick = () => {
  document.getElementById('modal').classList.add('hidden');
};
document.getElementById('use-color').onclick = selectColor;
document.getElementById('size').oninput = updateGradient;
document.getElementById('fill-mode').onchange = updateGradient;
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
  document.getElementById('glassTL-img').src = randomGlassTL.path;
  document.getElementById('glassTL-img').classList.remove('hidden');
  document.getElementById('glassTL-label').textContent = randomGlassTL.name;

  glassTR = randomGlassTR;
  document.getElementById('glassTR-img').src = randomGlassTR.path;
  document.getElementById('glassTR-img').classList.remove('hidden');
  document.getElementById('glassTR-label').textContent = randomGlassTR.name;

  glassBL = randomGlassBL;
  document.getElementById('glassBL-img').src = randomGlassBL.path;
  document.getElementById('glassBL-img').classList.remove('hidden');
  document.getElementById('glassBL-label').textContent = randomGlassBL.name;

  glassBR = randomGlassBR;
  document.getElementById('glassBR-img').src = randomGlassBR.path;
  document.getElementById('glassBR-img').classList.remove('hidden');
  document.getElementById('glassBR-label').textContent = randomGlassBR.name;

  updateGradient();
};

// Initialize block loading
loadBlocks();