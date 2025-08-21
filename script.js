let blocks = [];
let sourceA = null;
let sourceB = null;
let currentSource = null;

// Charger les blocs depuis le fichier JSON
async function loadBlocks() {
  try {
    const response = await fetch('blocks.json');
    blocks = await response.json();
    showBlocks(); // Initialiser l'affichage des blocs après le chargement
  } catch (error) {
    console.error('Erreur lors du chargement des blocs:', error);
  }
}

function openModal(source) {
  currentSource = source;
  document.getElementById('modal').classList.remove('hidden');
  showBlocks();
}

function showBlocks() {
  const blocksContent = document.getElementById('blocks-content');
  blocksContent.classList.remove('hidden');
  document.getElementById('color-content').classList.add('hidden');
  document.getElementById('tab-blocks').classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-blocks').classList.remove('bg-gray-300', 'text-black');
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

function showColorPicker() {
  document.getElementById('blocks-content').classList.add('hidden');
  document.getElementById('color-content').classList.remove('hidden');
  document.getElementById('tab-blocks').classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-blocks').classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-color').classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-color').classList.remove('bg-gray-300', 'text-black');
}

function selectBlock(block) {
  const sourceId = currentSource === 'sourceA' ? 'sourceA' : 'sourceB';
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  img.src = block.path;
  img.classList.remove('hidden');
  label.textContent = block.name;
  if (currentSource === 'sourceA') sourceA = block;
  else sourceB = block;
  document.getElementById('modal').classList.add('hidden');
  updateGradient();
}

function selectColor() {
  const color = document.getElementById('color-picker').value;
  const sourceId = currentSource === 'sourceA' ? 'sourceA' : 'sourceB';
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  img.src = '';
  img.classList.add('hidden');
  label.textContent = `Couleur: ${color}`;
  if (currentSource === 'sourceA') sourceA = { name: color, color: hexToRgb(color), path: null, view: 'both' };
  else sourceB = { name: color, color: hexToRgb(color), path: null, view: 'both' };
  document.getElementById('modal').classList.add('hidden');
  updateGradient();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function updateGradient() {
  if (!sourceA || !sourceB) return;
  const length = parseInt(document.getElementById('length').value) || 16;
  const fillMode = document.getElementById('fill-mode').value;
  const viewMode = document.getElementById('view-mode').value;
  const gradient = document.getElementById('gradient');
  gradient.innerHTML = '';

  if (fillMode === 'exact') {
    // Linear interpolation for exact colors
    for (let i = 0; i < length; i++) {
      const t = i / (length - 1);
      const r = Math.round(sourceA.color.r + (sourceB.color.r - sourceA.color.r) * t);
      const g = Math.round(sourceA.color.g + (sourceB.color.g - sourceA.color.g) * t);
      const b = Math.round(sourceA.color.b + (sourceB.color.b - sourceA.color.b) * t);
      const div = document.createElement('div');
      div.className = 'gradient-square';
      div.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
      div.innerHTML = `<span class="tooltip">Couleur: rgb(${r}, ${g}, ${b})</span>`;
      gradient.appendChild(div);
    }
  } else {
    // Linear interpolation with nearest block, filtered by view
    for (let i = 0; i < length; i++) {
      const t = i / (length - 1);
      const r = Math.round(sourceA.color.r + (sourceB.color.r - sourceA.color.r) * t);
      const g = Math.round(sourceA.color.g + (sourceB.color.g - sourceA.color.g) * t);
      const b = Math.round(sourceA.color.b + (sourceB.color.b - sourceA.color.b) * t);
      const nearestBlock = findNearestBlock({ r, g, b }, viewMode);
      const div = document.createElement('div');
      div.className = 'gradient-square';
      div.innerHTML = `<img src="${nearestBlock.path}" alt="${nearestBlock.name}" /><span class="tooltip">${nearestBlock.name}</span>`;
      gradient.appendChild(div);
    }
  }
}

function findNearestBlock(color, viewMode) {
  let minDistance = Infinity;
  let nearestBlock = blocks[0];
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0) return blocks[0]; // Fallback if no blocks match the view
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

document.getElementById('tab-blocks').onclick = showBlocks;
document.getElementById('tab-color').onclick = showColorPicker;
document.getElementById('close-modal').onclick = () => {
  document.getElementById('modal').classList.add('hidden');
};
document.getElementById('use-color').onclick = selectColor;
document.getElementById('length').oninput = updateGradient;
document.getElementById('fill-mode').onchange = updateGradient;
document.getElementById('view-mode').onchange = updateGradient;
document.getElementById('copy').onclick = () => {
  const gradient = document.getElementById('gradient');
  const names = Array.from(gradient.querySelectorAll('.tooltip')).map(span => span.textContent);
  navigator.clipboard.writeText(names.join(','));
  alert('Liste copiée !');
};
document.getElementById('surprise').onclick = () => {
  const viewMode = document.getElementById('view-mode').value;
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0) return; // Prevent action if no blocks match
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
  updateGradient();
};

// Initialiser le chargement des blocs
loadBlocks();