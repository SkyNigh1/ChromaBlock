let blocks = [];
let glassBlocks = [];
let sources = {
  topLeft: { base: null, glass: null },
  topRight: { base: null, glass: null },
  bottomLeft: { base: null, glass: null },
  bottomRight: { base: null, glass: null }
};
let currentSource = null;
let currentType = null;

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
    console.error('Erreur lors du chargement des blocs:', error);
  }
}

function openModal(source, type) {
  currentSource = source;
  currentType = type;
  document.getElementById('modal').classList.remove('hidden');
  showBlocks();
}

function showBlocks() {
  const blocksContent = document.getElementById('blocks-content');
  blocksContent.classList.remove('hidden');
  document.getElementById('color-content').classList.add('hidden');
  document.getElementById('tab-blocks').classList.add('active');
  document.getElementById('tab-glass').classList.remove('active');
  document.getElementById('tab-color').classList.remove('active');

  blocksContent.innerHTML = '';
  const data = currentType === 'glass' ? glassBlocks : blocks;
  data.forEach(item => {
    const div = document.createElement('div');
    div.className = 'block-option';
    if (item.path) {
      div.innerHTML = `<img src="${item.path}" alt="${item.name}" title="${item.name}" />`;
    } else {
      div.style.backgroundColor = 'transparent';
      div.innerHTML = `<span>${item.name}</span>`;
    }
    div.onclick = () => selectBlock(item);
    blocksContent.appendChild(div);
  });
}

function showGlassBlocks() {
  const blocksContent = document.getElementById('blocks-content');
  blocksContent.classList.remove('hidden');
  document.getElementById('color-content').classList.add('hidden');
  document.getElementById('tab-blocks').classList.remove('active');
  document.getElementById('tab-glass').classList.add('active');
  document.getElementById('tab-color').classList.remove('active');

  blocksContent.innerHTML = '';
  glassBlocks.forEach(glass => {
    const div = document.createElement('div');
    div.className = 'block-option';
    if (glass.path) {
      div.innerHTML = `<img src="${glass.path}" alt="${glass.name}" title="${glass.name}" />`;
    } else {
      div.style.backgroundColor = 'transparent';
      div.innerHTML = `<span>${glass.name}</span>`;
    }
    div.onclick = () => selectBlock(glass);
    blocksContent.appendChild(div);
  });
}

function showColorPicker() {
  document.getElementById('blocks-content').classList.add('hidden');
  document.getElementById('color-content').classList.remove('hidden');
  document.getElementById('tab-blocks').classList.remove('active');
  document.getElementById('tab-glass').classList.remove('active');
  document.getElementById('tab-color').classList.add('active');
}

function selectBlock(block) {
  const sourceId = currentSource;
  const type = currentType;
  const img = document.getElementById(`${sourceId}-${type}-img`);
  const label = document.getElementById(`${sourceId}-${type}-label`);
  img.src = block.path || '';
  img.classList.toggle('hidden', !block.path);
  label.textContent = block.name;
  sources[sourceId][type] = block;
  document.getElementById('modal').classList.add('hidden');
  updateGradient();
}

function selectColor() {
  const color = document.getElementById('color-picker').value;
  const sourceId = currentSource;
  const type = currentType;
  const img = document.getElementById(`${sourceId}-${type}-img`);
  const label = document.getElementById(`${sourceId}-${type}-label`);
  img.src = '';
  img.classList.add('hidden');
  label.textContent = `Couleur: ${color}`;
  sources[sourceId][type] = { name: color, color: hexToRgb(color), path: null, view: 'both', alpha: type === 'glass' ? 0.44 : 1 };
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
  if (!sources.topLeft.base || !sources.topRight.base || !sources.bottomLeft.base || !sources.bottomRight.base) return;
  const size = parseInt(document.getElementById('size').value) || 16;
  const fillMode = document.getElementById('fill-mode').value;
  const viewMode = document.getElementById('view-mode').value;
  const gradient = document.getElementById('gradient');
  gradient.innerHTML = '';
  const baseSize = 32; // Base size of each square
  const scale = 1.5; // 1.5x larger
  const squareSize = baseSize * scale; // 48px
  gradient.style.gridTemplateColumns = `repeat(${size}, ${squareSize}px)`;
  gradient.style.gridTemplateRows = `repeat(${size}, ${squareSize}px)`;

  if (fillMode === 'exact') {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / (size - 1);
        const v = y / (size - 1);
        const color = bilinearInterpolateColor(
          sources.topLeft.base.color,
          sources.topRight.base.color,
          sources.bottomLeft.base.color,
          sources.bottomRight.base.color,
          u, v
        );
        const glassColor = bilinearInterpolateGlass(
          sources.topLeft.glass,
          sources.topRight.glass,
          sources.bottomLeft.glass,
          sources.bottomRight.glass,
          u, v
        );
        const finalColor = glassColor ? blendColors(color, glassColor) : color;
        const div = document.createElement('div');
        div.className = 'gradient-square';
        div.style.width = `${squareSize}px`;
        div.style.height = `${squareSize}px`;
        div.style.backgroundColor = `rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})`;
        div.innerHTML = `<span class="tooltip">Couleur: rgb(${finalColor.r}, ${finalColor.g}, ${finalColor.b})</span>`;
        gradient.appendChild(div);
      }
    }
  } else {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = x / (size - 1);
        const v = y / (size - 1);
        const color = bilinearInterpolateColor(
          sources.topLeft.base.color,
          sources.topRight.base.color,
          sources.bottomLeft.base.color,
          sources.bottomRight.base.color,
          u, v
        );
        const glass = bilinearInterpolateGlass(
          sources.topLeft.glass,
          sources.topRight.glass,
          sources.bottomLeft.glass,
          sources.bottomRight.glass,
          u, v
        );
        const finalColor = glass ? blendColors(color, glass) : color;
        const nearest = findNearestBlockPair(finalColor, viewMode);
        const div = document.createElement('div');
        div.className = 'gradient-square';
        div.style.width = `${squareSize}px`;
        div.style.height = `${squareSize}px`;
        let tooltip = `Base: ${nearest.base.name}`;
        div.innerHTML = `<img src="${nearest.base.path}" class="base-img" alt="${nearest.base.name}" />`;
        if (nearest.glass && nearest.glass.name !== 'none') {
          div.innerHTML += `<img src="${nearest.glass.path}" class="glass-img" alt="${nearest.glass.name}" />`;
          tooltip += `, Glass: ${nearest.glass.name}`;
        }
        div.innerHTML += `<span class="tooltip">${tooltip}</span>`;
        gradient.appendChild(div);
      }
    }
  }
}

function bilinearInterpolateColor(c1, c2, c3, c4, u, v) {
  const r = Math.round(
    (1 - u) * (1 - v) * c1.r +
    u * (1 - v) * c2.r +
    (1 - u) * v * c3.r +
    u * v * c4.r
  );
  const g = Math.round(
    (1 - u) * (1 - v) * c1.g +
    u * (1 - v) * c2.g +
    (1 - u) * v * c3.g +
    u * v * c4.g
  );
  const b = Math.round(
    (1 - u) * (1 - v) * c1.b +
    u * (1 - v) * c2.b +
    (1 - u) * v * c3.b +
    u * v * c4.b
  );
  return { r, g, b };
}

function bilinearInterpolateGlass(g1, g2, g3, g4, u, v) {
  if (!g1 || !g2 || !g3 || !g4 || g1.name === 'none') return null;
  const alpha = (1 - u) * (1 - v) * (g1.alpha || 0.44) +
                u * (1 - v) * (g2.alpha || 0.44) +
                (1 - u) * v * (g3.alpha || 0.44) +
                u * v * (g4.alpha || 0.44);
  const r = Math.round(
    (1 - u) * (1 - v) * g1.color.r +
    u * (1 - v) * g2.color.r +
    (1 - u) * v * g3.color.r +
    u * v * g4.color.r
  );
  const g = Math.round(
    (1 - u) * (1 - v) * g1.color.g +
    u * (1 - v) * g2.color.g +
    (1 - u) * v * g3.color.g +
    u * v * g4.color.g
  );
  const b = Math.round(
    (1 - u) * (1 - v) * g1.color.b +
    u * (1 - v) * g2.color.b +
    (1 - u) * v * g3.color.b +
    u * v * g4.color.b
  );
  return { r, g, b, alpha };
}

function blendColors(base, glass) {
  const alpha = glass.alpha || 0.44;
  const r = Math.round((1 - alpha) * base.r + alpha * glass.r);
  const g = Math.round((1 - alpha) * base.g + alpha * glass.g);
  const b = Math.round((1 - alpha) * base.b + alpha * glass.b);
  return { r, g, b };
}

function findNearestBlockPair(color, viewMode) {
  let minDistance = Infinity;
  let bestPair = { base: blocks[0], glass: glassBlocks[0] };
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  const filteredGlass = glassBlocks.filter(glass => glass.name === 'none' || viewMode === 'both' || glass.view === viewMode || glass.view === 'both');
  filteredBlocks.forEach(base => {
    filteredGlass.forEach(glass => {
      const targetColor = glass.name === 'none' ? base.color : blendColors(base.color, glass.color);
      const distance =
        Math.pow(targetColor.r - color.r, 2) +
        Math.pow(targetColor.g - color.g, 2) +
        Math.pow(targetColor.b - color.b, 2);
      if (distance < minDistance) {
        minDistance = distance;
        bestPair = { base, glass };
      }
    });
  });
  return bestPair;
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
  navigator.clipboard.writeText(names.join('\n'));
  alert('Liste copiée !');
};
document.getElementById('surprise').onclick = () => {
  const viewMode = document.getElementById('view-mode').value;
  const filteredBlocks = blocks.filter(block => viewMode === 'both' || block.view === viewMode || block.view === 'both');
  const filteredGlass = glassBlocks.filter(glass => glass.name === 'none' || viewMode === 'both' || glass.view === viewMode || glass.view === 'both');
  if (filteredBlocks.length === 0 || filteredGlass.length === 0) return;
  const corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
  corners.forEach(corner => {
    const randomBase = filteredBlocks[Math.floor(Math.random() * filteredBlocks.length)];
    const randomGlass = filteredGlass[Math.floor(Math.random() * filteredGlass.length)];
    sources[corner].base = randomBase;
    sources[corner].glass = randomGlass;
    document.getElementById(`${corner}-base-img`).src = randomBase.path;
    document.getElementById(`${corner}-base-img`).classList.remove('hidden');
    document.getElementById(`${corner}-base-label`).textContent = randomBase.name;
    document.getElementById(`${corner}-glass-img`).src = randomGlass.path || '';
    document.getElementById(`${corner}-glass-img`).classList.toggle('hidden', !randomGlass.path);
    document.getElementById(`${corner}-glass-label`).textContent = randomGlass.name;
  });
  updateGradient();
};

loadBlocks();