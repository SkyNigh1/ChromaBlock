async function exportToSchematic() {
  const gradient = document.getElementById('gradient');
  const sizeInput = document.getElementById('size');
  const size = parseInt(sizeInput.value) || 16;
  const squares = gradient.querySelectorAll('.gradient-square');
  if (!squares.length) {
    alert('Please generate a gradient first!');
    return;
  }

  console.log('Exporting .schem with size:', size);

  // Charger les JSON
  let blocksData, glassData;
  try {
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('blocks.json'),
      fetch('glass.json')
    ]);
    blocksData = await blocksResponse.json();
    glassData = await glassResponse.json();
  } catch (error) {
    console.error('Error loading block or glass data:', error);
    alert('Failed to load block data: ' + error.message);
    return;
  }

  // Construire la liste des blocs valides
  const blockNames = blocksData.map(b => "minecraft:" + b.name);
  const glassNames = glassData.map(g =>
    g.name === "none" ? "minecraft:air" : "minecraft:" + g.name
  );

  // Palette + indexation
  const palette = {};
  let paletteIndex = 0;
  function getPaletteIndex(name) {
    if (!(name in palette)) {
      palette[name] = paletteIndex++;
    }
    return palette[name];
  }

  // Dimensions
  const width = size;
  const height = 2; // base + couche verre
  const length = size;
  const volume = width * height * length;
  const blockData = new Int32Array(volume).fill(0);

  // Remplissage
  let validBlocks = 0;
  squares.forEach((square, index) => {
    const x = index % width;
    const z = Math.floor(index / width);
    const tooltip = square.querySelector('.tooltip')?.textContent;
    if (!tooltip) return;

    let baseName = "minecraft:stone";
    let glassName = null;

    const baseMatch = tooltip.match(/Base: ([^,]+)/);
    const glassMatch = tooltip.match(/Glass: ([^,]+)/);

    if (baseMatch) baseName = "minecraft:" + baseMatch[1].trim();
    if (glassMatch && glassMatch[1].trim() !== "none") {
      glassName = "minecraft:" + glassMatch[1].trim();
    }

    const baseIndex = x + z * width + 0 * width * length;
    blockData[baseIndex] = getPaletteIndex(baseName);

    if (glassName) {
      const glassIndex = x + z * width + 1 * width * length;
      blockData[glassIndex] = getPaletteIndex(glassName);
    }

    validBlocks++;
  });

  console.log(`Processed ${validBlocks} blocks into palette of size ${paletteIndex}`);

  // === Structure NBT Schematic v2 ===
  const nbtData = {
    name: '', // racine non nommée
    value: {
      SchematicVersion: { type: 'int', value: 2 },
      Version: { type: 'int', value: 2 },
      DataVersion: { type: 'int', value: 3953 }, // 1.21.4
      Width: { type: 'short', value: width },
      Height: { type: 'short', value: height },
      Length: { type: 'short', value: length },
      Offset: { type: 'intArray', value: [0, 0, 0] },
      PaletteMax: { type: 'int', value: paletteIndex },
      Palette: {
        type: 'compound',
        value: Object.fromEntries(
          Object.entries(palette).map(([name, idx]) => [
            name, { type: 'int', value: idx }
          ])
        )
      },
      BlockData: { type: 'intArray', value: Array.from(blockData) },
      BlockEntities: { type: 'list', value: { type: 'compound', value: [] } }
    }
  };

  // --- Écriture NBT ---
  function writeNBT(root) {
    const buffer = [];
    buffer.push(0x0A); // TAG_Compound
    writeString(root.name, buffer);
    writeCompoundContent(root.value, buffer);
    buffer.push(0x00); // End root
    return new Uint8Array(buffer);
  }

  function writeCompoundContent(compound, buffer) {
    for (const [key, tag] of Object.entries(compound)) {
      writeNBTTag(tag, key, buffer);
    }
    buffer.push(0x00); // End compound
  }

  function writeNBTTag(tag, name, buffer) {
    const tagId = getTagId(tag.type);
    buffer.push(tagId);
    writeString(name, buffer);

    switch (tag.type) {
      case 'byte': buffer.push(tag.value & 0xff); break;
      case 'short': writeInt16(tag.value, buffer); break;
      case 'int': writeInt32(tag.value, buffer); break;
      case 'string': writeString(tag.value, buffer); break;

      case 'intArray':
        writeInt32(tag.value.length, buffer);
        tag.value.forEach(v => writeInt32(v, buffer));
        break;

      case 'compound':
        writeCompoundContent(tag.value, buffer);
        break;

      case 'list':
        buffer.push(getTagId(tag.value.type));
        writeInt32(tag.value.value.length, buffer);
        if (tag.value.type === 'compound') {
          tag.value.value.forEach(item => writeCompoundContent(item, buffer));
        }
        break;
    }
  }

  function writeInt16(value, buffer) {
    buffer.push((value >> 8) & 0xff, value & 0xff);
  }
  function writeInt32(value, buffer) {
    buffer.push(
      (value >> 24) & 0xff,
      (value >> 16) & 0xff,
      (value >> 8) & 0xff,
      value & 0xff
    );
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
      string: 8,
      list: 9,
      compound: 10,
      byteArray: 7,
      intArray: 11
    }[type] || 0;
  }

  // Compression + téléchargement
  try {
    const nbtBuffer = writeNBT(nbtData);
    const compressed = pako.gzip(nbtBuffer);
    const blob = new Blob([compressed], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gradient.schem';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`.schem exported! ${validBlocks} blocks processed.`);
  } catch (err) {
    console.error('Export failed:', err);
    alert('Failed to export schematic: ' + err.message);
  }
}

document.getElementById('export-schematic').onclick = exportToSchematic;
