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
    if (!blocksResponse.ok || !glassResponse.ok) {
      throw new Error(`Failed to fetch JSON files: blocks(${blocksResponse.status}), glass(${glassResponse.status})`);
    }
    blocks = await blocksResponse.json();
    glassBlocks = await glassResponse.json();
    console.log('Blocks loaded:', blocks.length, 'Glass blocks loaded:', glassBlocks.length);

    // Initialize glass sources to "none"
    const noneGlass = glassBlocks.find(b => b.name === 'none') || { name: 'none', path: null, color: { r: 0, g: 0, b: 0 }, alpha: 0.0, view: 'both' };
    glassTL = glassTR = glassBL = glassBR = noneGlass;
    document.getElementById('glassTL-label')?.textContent = 'None';
    document.getElementById('glassTR-label')?.textContent = 'None';
    document.getElementById('glassBL-label')?.textContent = 'None';
    document.getElementById('glassBR-label')?.textContent = 'None';

    // Set default base blocks to ensure gradient can render
    const defaultBlock = blocks.find(b => b.name === 'stone') || blocks[0] || { name: 'stone', path: '', color: { r: 128, g: 128, b: 128 }, view: 'both' };
    baseTL = baseTR = baseBL = baseBR = defaultBlock;
    document.getElementById('baseTL-img')?.setAttribute('src', defaultBlock.path);
    document.getElementById('baseTL-img')?.classList.remove('hidden');
    document.getElementById('baseTL-label')?.textContent = defaultBlock.name;
    document.getElementById('baseTR-img')?.setAttribute('src', defaultBlock.path);
    document.getElementById('baseTR-img')?.classList.remove('hidden');
    document.getElementById('baseTR-label')?.textContent = defaultBlock.name;
    document.getElementById('baseBL-img')?.setAttribute('src', defaultBlock.path);
    document.getElementById('baseBL-img')?.classList.remove('hidden');
    document.getElementById('baseBL-label')?.textContent = defaultBlock.name;
    document.getElementById('baseBR-img')?.setAttribute('src', defaultBlock.path);
    document.getElementById('baseBR-img')?.classList.remove('hidden');
    document.getElementById('baseBR-label')?.textContent = defaultBlock.name;

    showBlocks();
    updateGradient();
  } catch (error) {
    console.error('Error loading blocks or glass:', error);
    alert('Failed to load block data. Check console for details.');
  }
}

function openModal(source) {
  currentSource = source;
  const modal = document.getElementById('modal');
  if (!modal) {
    console.error('Modal element not found');
    alert('Modal not found. Check HTML.');
    return;
  }
  modal.classList.remove('hidden');
  if (source.startsWith('glass')) {
    showGlassBlocks();
  } else {
    showBlocks();
  }
}

function showBlocks() {
  const blocksContent = document.getElementById('blocks-content');
  if (!blocksContent) {
    console.error('blocks-content element not found');
    alert('Block selection area not found. Check HTML.');
    return;
  }
  if (blocks.length === 0) {
    console.error('No blocks available to display');
    alert('No blocks available. Ensure blocks.json is loaded.');
    return;
  }
  blocksContent.classList.remove('hidden');
  document.getElementById('glass-content')?.classList.add('hidden');
  document.getElementById('color-content')?.classList.add('hidden');
  document.getElementById('tab-blocks')?.classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-blocks')?.classList.remove('bg-gray-300', 'text-black');
  document.getElementById('tab-glass')?.classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-glass')?.classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-color')?.classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-color')?.classList.remove('bg-blue-600', 'text-white');

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
  const glassContent = document.getElementById('glass-content');
  if (!glassContent) {
    console.error('glass-content element not found');
    alert('Glass block selection area not found. Check HTML.');
    return;
  }
  if (glassBlocks.length === 0) {
    console.error('No glass blocks available to display');
    alert('No glass blocks available. Ensure glass.json is loaded.');
    return;
  }
  document.getElementById('blocks-content')?.classList.add('hidden');
  glassContent.classList.remove('hidden');
  document.getElementById('color-content')?.classList.add('hidden');
  document.getElementById('tab-blocks')?.classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-blocks')?.classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-glass')?.classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-glass')?.classList.remove('bg-gray-300', 'text-black');
  document.getElementById('tab-color')?.classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-color')?.classList.remove('bg-blue-600', 'text-white');

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
  const colorContent = document.getElementById('color-content');
  if (!colorContent) {
    console.error('color-content element not found');
    alert('Color picker area not found. Check HTML.');
    return;
  }
  document.getElementById('blocks-content')?.classList.add('hidden');
  document.getElementById('glass-content')?.classList.add('hidden');
  colorContent.classList.remove('hidden');
  document.getElementById('tab-blocks')?.classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-blocks')?.classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-glass')?.classList.add('bg-gray-300', 'text-black');
  document.getElementById('tab-glass')?.classList.remove('bg-blue-600', 'text-white');
  document.getElementById('tab-color')?.classList.add('bg-blue-600', 'text-white');
  document.getElementById('tab-color')?.classList.remove('bg-gray-300', 'text-black');
}

function selectBlock(block) {
  if (!block) return;
  const sourceId = currentSource;
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  if (!img || !label) {
    console.error(`Element not found for sourceId: ${sourceId}`);
    return;
  }
  img.setAttribute('src', block.path);
  img.classList.remove('hidden');
  label.textContent = block.name;
  if (currentSource === 'baseTL') baseTL = block;
  else if (currentSource === 'baseTR') baseTR = block;
  else if (currentSource === 'baseBL') baseBL = block;
  else if (currentSource === 'baseBR') baseBR = block;
  document.getElementById('modal')?.classList.add('hidden');
  updateGradient();
}

function selectGlassBlock(block) {
  if (!block) return;
  const sourceId = currentSource;
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  if (!img || !label) {
    console.error(`Element not found for sourceId: ${sourceId}`);
    return;
  }
  img.setAttribute('src', block.path || '');
  img.classList[block.path ? 'remove' : 'add']('hidden');
  label.textContent = block.name;
  if (currentSource === 'glassTL') glassTL = block;
  else if (currentSource === 'glassTR') glassTR = block;
  else if (currentSource === 'glassBL') glassBL = block;
  else if (currentSource === 'glassBR') glassBR = block;
  document.getElementById('modal')?.classList.add('hidden');
  updateGradient();
}

function selectColor() {
  const color = document.getElementById('color-picker')?.value;
  if (!color) {
    console.error('Color picker not found or no value selected');
    return;
  }
  const sourceId = currentSource;
  const img = document.getElementById(`${sourceId}-img`);
  const label = document.getElementById(`${sourceId}-label`);
  if (!img || !label) {
    console.error(`Element not found for sourceId: ${sourceId}`);
    return;
  }
  img.setAttribute('src', '');
  img.classList.add('hidden');
  label.textContent = `Color: ${color}`;
  const colorObj = hexToRgb(color);
  colorObj.name = color;
  colorObj.view = 'both';
  if (currentSource === 'baseTL') baseTL = colorObj;
  else if (currentSource === 'baseTR') baseTR = colorObj;
  else if (currentSource === 'baseBL') baseBL = colorObj;
  else if (currentSource === 'baseBR') baseBR = colorObj;
  else if (currentSource === 'glassTL') glassTL = { ...colorObj, alpha: 0.5 };
  else if (currentSource === 'glassTR') glassTR = { ...colorObj, alpha: 0.5 };
  else if (currentSource === 'glassBL') glassBL = { ...colorObj, alpha: 0.5 };
  else if (currentSource === 'glassBR') glassBR = { ...colorObj, alpha: 0.5 };
  document.getElementById('modal')?.classList.add('hidden');
  updateGradient();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function blendColors(base, glass) {
  if (!base || !glass) {
    console.warn('Missing base or glass for blending:', { base, glass });
    return { r: 0, g: 0, b: 0 };
  }
  if (glass.name === 'none') return base.color || base;
  const alpha = glass.alpha || 0.5;
  const r = Math.round(base.color.r * (1 - alpha) + glass.color.r * alpha);
  const g = Math.round(base.color.g * (1 - alpha) + glass.color.g * alpha);
  const b = Math.round(base.color.b * (1 - alpha) + glass.color.b * alpha);
  return { r, g, b };
}

function updateGradient() {
  if (!baseTL || !baseTR || !baseBL || !baseBR) {
    console.warn('Not all corner blocks selected:', { baseTL, baseTR, baseBL, baseBR });
    return;
  }
  const size = parseInt(document.getElementById('size')?.value) || 16;
  const fillMode = document.getElementById('fill-mode')?.value || 'nearest';
  const viewMode = document.getElementById('view-mode')?.value || 'both';
  const gradient = document.getElementById('gradient');
  if (!gradient) {
    console.error('Gradient element not found');
    alert('Gradient area not found. Check HTML.');
    return;
  }
  gradient.innerHTML = '';
  gradient.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const c00 = blendColors(baseTL, glassTL);
      const c10 = blendColors(baseTR, glassTR);
      const c01 = blendColors(baseBL, glassBL);
      const c11 = blendColors(baseBR, glassBR);
      const r = Math.round(c00.r * (1 - u) * (1 - v) + c10.r * u * (1 - v) + c01.r * (1 - u) * v + c11.r * u * v);
      const g = Math.round(c00.g * (1 - u) * (1 - v) + c10.g * u * (1 - v) + c01.g * (1 - u) * v + c11.g * u * v);
      const b = Math.round(c00.b * (1 - u) * (1 - v) + c10.b * u * (1 - v) + c01.b * (1 - u) * v + c11.b * u * v);
      const div = document.createElement('div');
      div.className = 'gradient-square';
      if (fillMode === 'exact') {
        div.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        div.innerHTML = `<span class="tooltip">Color: rgb(${r}, ${g}, ${b})</span>`;
      } else {
        const { base, glass } = findNearestBlock({ r, g, b }, viewMode);
        div.innerHTML = `<img src="${base.path}" alt="${base.name}" class="base-img" />`;
        if (glass.name !== 'none') {
          div.innerHTML += `<img src="${glass.path}" alt="${glass.name}" class="glass-img" />`;
        }
        div.innerHTML += `<span class="tooltip">${base.name}${glass.name !== 'none' ? ', ' + glass.name : ''}</span>`;
      }
      gradient.appendChild(div);
    }
  }
}

function findNearestBlock(targetColor, viewMode) {
  let minDistance = Infinity;
  let bestBase = blocks[0] || { name: 'stone', path: '', color: { r: 128, g: 128, b: 128 }, view: 'both' };
  let bestGlass = glassBlocks.find(b => b.name === 'none') || { name: 'none', path: null, color: { r: 0, g: 0, b: 0 }, alpha: 0.0, view: 'both' };
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  const filteredGlass = glassBlocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  if (filteredBlocks.length === 0 || filteredGlass.length === 0) {
    console.warn('No blocks available for viewMode:', viewMode);
    return { base: bestBase, glass: bestGlass };
  }

  filteredBlocks.forEach(base => {
    filteredGlass.forEach(glass => {
      const blendedColor = blendColors(base, glass);
      const distance =
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

function exportToSchematic() {
  if (!baseTL || !baseTR || !baseBL || !baseBR) {
    console.warn('Not all corner blocks selected for export');
    alert('Please select all corner blocks before exporting.');
    return;
  }
  const size = parseInt(document.getElementById('size')?.value) || 16;
  const gradient = document.getElementById('gradient');
  if (!gradient) {
    console.error('Gradient element not found');
    alert('Gradient area not found. Check HTML.');
    return;
  }

  // Create block data for 2 layers (base and glass)
  const blockData = new Uint8Array(size * size * 2);
  const blockIds = [];

  // Collect gradient blocks from the DOM
  const squares = gradient.querySelectorAll('.gradient-square');
  if (squares.length !== size * size) {
    console.error('Gradient size mismatch:', squares.length, 'expected:', size * size);
    alert('Gradient data is incomplete. Refresh and try again.');
    return;
  }
  squares.forEach((square, index) => {
    const tooltip = square.querySelector('.tooltip')?.textContent;
    if (!tooltip) {
      console.error('Tooltip missing for square:', index);
      return;
    }
    const [baseName, glassName] = tooltip.includes(',') ? tooltip.split(', ') : [tooltip, 'none'];
    const baseId = `minecraft:${baseName}`;
    const glassId = glassName === 'none' ? 'minecraft:air' : `minecraft:${glassName}`;
    const baseIndex = index * 2; // Bottom layer (y=0)
    const glassIndex = index * 2 + 1; // Top layer (y=1)
    if (!blockIds.includes(baseId)) blockIds.push(baseId);
    if (!blockIds.includes(glassId)) blockIds.push(glassId);
    blockData[baseIndex] = blockIds.indexOf(baseId);
    blockData[glassIndex] = blockIds.indexOf(glassId);
  });

  // Create Palette for NBT
  const palette = {};
  blockIds.forEach((id, index) => {
    palette[id] = { type: 'int', value: index };
  });

  // Create NBT structure
  const schematic = {
    tagName: 'Schematic',
    value: {
      Width: { type: 'short', value: size },
      Height: { type: 'short', value: 2 }, // 2 layers: base and glass
      Length: { type: 'short', value: size },
      Blocks: { type: 'byteArray', value: blockData },
      Data: { type: 'byteArray', value: new Uint8Array(size * size * 2) }, // No block states
      BlockEntities: { type: 'list', value: { type: 'compound', value: [] } },
      Entities: { type: 'list', value: { type: 'compound', value: [] } },
      Palette: { type: 'compound', value: palette },
      PaletteMax: { type: 'int', value: blockIds.length }
    }
  };

  // Serialize NBT and create downloadable file
  try {
    const nbtData = nbt.write(schematic);
    const blob = new Blob([nbtData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gradient.schematic';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    alert('Schematic exported successfully!');
  } catch (error) {
    console.error('Error exporting schematic:', error);
    alert('Failed to export schematic. Check console.');
  }
}

// Event listeners
document.getElementById('tab-blocks')?.addEventListener('click', showBlocks);
document.getElementById('tab-glass')?.addEventListener('click', showGlassBlocks);
document.getElementById('tab-color')?.addEventListener('click', showColorPicker);
document.getElementById('close-modal')?.addEventListener('click', () => {
  document.getElementById('modal')?.classList.add('hidden');
});
document.getElementById('use-color')?.addEventListener('click', selectColor);
document.getElementById('size')?.addEventListener('input', updateGradient);
document.getElementById('fill-mode')?.addEventListener('change', updateGradient);
document.getElementById('view-mode')?.addEventListener('change', updateGradient);
document.getElementById('copy')?.addEventListener('click', () => {
  const gradient = document.getElementById('gradient');
  if (!gradient) {
    console.error('Gradient element not found');
    return;
  }
  const names = Array.from(gradient.querySelectorAll('.tooltip')).map(span => span.textContent);
  navigator.clipboard.writeText(names.join(';')).then(() => {
    alert('List copied!');
  }).catch(err => {
    console.error('Failed to copy:', err);
    alert('Failed to copy list.');
  });
});
document.getElementById('surprise')?.addEventListener('click', () => {
  const viewMode = document.getElementById('view-mode')?.value;
  if (!viewMode) {
    console.error('View mode not selected');
    alert('View mode not selected.');
    return;
  }
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  const filteredGlass = glassBlocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  console.log('Filtered blocks:', filteredBlocks.length, 'Filtered glass:', filteredGlass.length);
  if (filteredBlocks.length === 0 || filteredGlass.length === 0) {
    console.error('No blocks or glass blocks available for viewMode:', viewMode);
    alert('No blocks available for the selected view mode.');
    return;
  }

  const randomBaseTL = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBaseTR = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBaseBL = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomBaseBR = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
  const randomGlassTL = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
  const randomGlassTR = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
  const randomGlassBL = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
  const randomGlassBR = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];

  baseTL = randomBaseTL;
  document.getElementById('baseTL-img')?.setAttribute('src', randomBaseTL.path);
  document.getElementById('baseTL-img')?.classList.remove('hidden');
  document.getElementById('baseTL-label')?.textContent = randomBaseTL.name;

  baseTR = randomBaseTR;
  document.getElementById('baseTR-img')?.setAttribute('src', randomBaseTR.path);
  document.getElementById('baseTR-img')?.classList.remove('hidden');
  document.getElementById('baseTR-label')?.textContent = randomBaseTR.name;

  baseBL = randomBaseBL;
  document.getElementById('baseBL-img')?.setAttribute('src', randomBaseBL.path);
  document.getElementById('baseBL-img')?.classList.remove('hidden');
  document.getElementById('baseBL-label')?.textContent = randomBaseBL.name;

  baseBR = randomBaseBR;
  document.getElementById('baseBR-img')?.setAttribute('src', randomBaseBR.path);
  document.getElementById('baseBR-img')?.classList.remove('hidden');
  document.getElementById('baseBR-label')?.textContent = randomBaseBR.name;

  glassTL = randomGlassTL;
  document.getElementById('glassTL-img')?.setAttribute('src', randomGlassTL.path || '');
  document.getElementById('glassTL-img')?.classList[randomGlassTL.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassTL-label')?.textContent = randomGlassTL.name;

  glassTR = randomGlassTR;
  document.getElementById('glassTR-img')?.setAttribute('src', randomGlassTR.path || '');
  document.getElementById('glassTR-img')?.classList[randomGlassTR.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassTR-label')?.textContent = randomGlassTR.name;

  glassBL = randomGlassBL;
  document.getElementById('glassBL-img')?.setAttribute('src', randomGlassBL.path || '');
  document.getElementById('glassBL-img')?.classList[randomGlassBL.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassBL-label')?.textContent = randomGlassBL.name;

  glassBR = randomGlassBR;
  document.getElementById('glassBR-img')?.setAttribute('src', randomGlassBR.path || '');
  document.getElementById('glassBR-img')?.classList[randomGlassBR.path ? 'remove' : 'add']('hidden');
  document.getElementById('glassBR-label')?.textContent = randomGlassBR.name;

  console.log('Surprise triggered:', { baseTL, baseTR, baseBL, baseBR, glassTL, glassTR, glassBL, glassBR });
  updateGradient();
});
document.getElementById('export-schematic')?.addEventListener('click', exportToSchematic);

// Initialize block loading
loadBlocks();