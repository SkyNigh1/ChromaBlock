async function exportToSchematic() {
  const gradient = document.getElementById('gradient');
  const sizeInput = document.getElementById('size');
  const size = parseInt(sizeInput.value) || 16;
  const squares = gradient.querySelectorAll('.gradient-square');
  if (!squares.length) {
    console.error('No gradient squares found.');
    alert('Please generate a gradient first!');
    return;
  }

  console.log('Exporting schematic with size:', size);

  // Load block data from JSON files
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

  // Create block ID and data mappings dynamically
  const blockNameToId = {};
  const blockDataValues = {};

  // Base blocks mapping
  blocksData.forEach(block => {
    const name = block.name;
    // Assign legacy IDs based on known blocks; default to stone (ID 1) for unknown
    if (name === 'stone') blockNameToId[name] = 1;
    else if (name === 'grass_block') blockNameToId[name] = 2;
    else if (name === 'cobblestone') blockNameToId[name] = 4;
    else if (name === 'coal_ore') blockNameToId[name] = 16;
    else if (name === 'iron_block') blockNameToId[name] = 42;
    else if (name === 'furnace') blockNameToId[name] = 61;
    else if (name === 'redstone_ore') blockNameToId[name] = 73;
    else if (name === 'deepslate_redstone_ore') blockNameToId[name] = 74;
    else if (name === 'netherrack') blockNameToId[name] = 87;
    else if (name === 'mycelium') blockNameToId[name] = 110;
    else if (name === 'nether_bricks') blockNameToId[name] = 112;
    else if (name === 'coal_block') blockNameToId[name] = 173;
    else if (name === 'red_nether_bricks') blockNameToId[name] = 215;
    else if (name === 'observer') blockNameToId[name] = 218;
    else if (name === 'pink_glazed_terracotta') blockNameToId[name] = 231;
    else if (name === 'black_glazed_terracotta') blockNameToId[name] = 235;
    else if (name === 'red_concrete') blockNameToId[name] = 251;
    else if (name === 'pink_concrete') blockNameToId[name] = 251;
    else if (name === 'pink_concrete_powder') blockNameToId[name] = 252;
    else if (name === 'fire_coral_block') blockNameToId[name] = 387;
    else if (name === 'cracked_nether_bricks') blockNameToId[name] = 406;
    else if (name === 'suspicious_gravel') blockNameToId[name] = 438;
    else if (name === 'blast_furnace') blockNameToId[name] = 451;
    else if (name === 'crafter') blockNameToId[name] = 454;
    else if (name === 'smithing_table') blockNameToId[name] = 457;
    else if (name === 'crimson_nylium') blockNameToId[name] = 487;
    else if (name === 'netherite_block') blockNameToId[name] = 525;
    else if (name === 'pearlescent_froglight') blockNameToId[name] = 549;
    else if (name === 'chiseled_deepslate') blockNameToId[name] = 648;
    else if (name.includes('log') || name.includes('stem')) blockNameToId[name] = 17; // Logs and stems
    else if (name.includes('terracotta')) blockNameToId[name] = 159; // Terracotta
    else if (name.includes('wool')) blockNameToId[name] = 35; // Wool
    else if (name.includes('slab')) blockNameToId[name] = 44; // Slabs
    else if (name.includes('concrete')) blockNameToId[name] = 251; // Concrete
    else blockNameToId[name] = 1; // Default to stone

    // Assign data values
    if (name === 'red_concrete') blockDataValues[name] = 14;
    else if (name === 'pink_concrete') blockDataValues[name] = 6;
    else if (name === 'pink_concrete_powder') blockDataValues[name] = 6;
    else if (name === 'purple_terracotta') blockDataValues[name] = 10;
    else if (name === 'magenta_terracotta') blockDataValues[name] = 2;
    else if (name === 'pink_wool') blockDataValues[name] = 6;
    else if (name === 'stripped_mangrove_log') blockDataValues[name] = 3;
    else if (name.includes('crimson_stem')) blockDataValues[name] = 4;
    else if (name === 'stripped_cherry_log') blockDataValues[name] = 5;
    else blockDataValues[name] = 0; // Default data value
  });

  // Glass blocks mapping
  glassData.forEach(glass => {
    const name = glass.name;
    blockNameToId[name] = name === 'none' ? 0 : 95; // Air for 'none', stained glass for others
    if (name !== 'none') {
      if (name === 'white_stained_glass') blockDataValues[name] = 0;
      else if (name === 'orange_stained_glass') blockDataValues[name] = 1;
      else if (name === 'magenta_stained_glass') blockDataValues[name] = 2;
      else if (name === 'light_blue_stained_glass') blockDataValues[name] = 3;
      else if (name === 'yellow_stained_glass') blockDataValues[name] = 4;
      else if (name === 'lime_stained_glass') blockDataValues[name] = 5;
      else if (name === 'pink_stained_glass') blockDataValues[name] = 6;
      else if (name === 'gray_stained_glass') blockDataValues[name] = 7;
      else if (name === 'light_gray_stained_glass') blockDataValues[name] = 8;
      else if (name === 'cyan_stained_glass') blockDataValues[name] = 9;
      else if (name === 'purple_stained_glass') blockDataValues[name] = 10;
      else if (name === 'blue_stained_glass') blockDataValues[name] = 11;
      else if (name === 'brown_stained_glass') blockDataValues[name] = 12;
      else if (name === 'green_stained_glass') blockDataValues[name] = 13;
      else if (name === 'red_stained_glass') blockDataValues[name] = 14;
      else if (name === 'black_stained_glass') blockDataValues[name] = 15;
    } else {
      blockDataValues[name] = 0;
    }
  });

  // Initialize schematic dimensions
  const width = size;
  const height = 2; // Base layer (y=0) and glass layer (y=1)
  const length = size;
  const volume = width * height * length;
  const blocks = new Uint8Array(volume).fill(0); // Default to air (ID 0)
  const data = new Uint8Array(volume).fill(0); // Block metadata

  // Parse gradient squares
  squares.forEach((square, index) => {
    const x = index % width;
    const z = Math.floor(index / width);
    const tooltip = square.querySelector('.tooltip')?.textContent;
    if (!tooltip) {
      console.warn(`No tooltip found for square ${index}`);
      return;
    }

    let baseName = 'stone';
    let glassName = null;

    const baseMatch = tooltip.match(/Base: ([^,]+)/);
    const glassMatch = tooltip.match(/Glass: ([^,]+)/);

    if (baseMatch) {
      baseName = baseMatch[1].trim();
      console.log(`Square ${index} (x:${x}, z:${z}): Base = ${baseName}`);
    } else {
      console.warn(`Square ${index} (x:${x}, z:${z}): No base block found in tooltip: ${tooltip}`);
    }

    if (glassMatch && glassMatch[1].trim() !== 'none') {
      glassName = glassMatch[1].trim();
      console.log(`Square ${index} (x:${x}, z:${z}): Glass = ${glassName}`);
    }

    // Set base block
    const baseBlockId = blockNameToId[baseName] || 1; // Default to stone
    const baseIndex = x + z * width + 0 * width * length;
    blocks[baseIndex] = baseBlockId;
    data[baseIndex] = blockDataValues[baseName] || 0;
    console.log(`Base block at (${x}, 0, ${z}): ID = ${baseBlockId}, Data = ${data[baseIndex]}`);

    // Set glass block (if any)
    if (glassName) {
      const glassBlockId = blockNameToId[glassName] || 0;
      const glassIndex = x + z * width + 1 * width * length;
      blocks[glassIndex] = glassBlockId;
      data[glassIndex] = blockDataValues[glassName] || 0;
      console.log(`Glass block at (${x}, 1, ${z}): ID = ${glassBlockId}, Data = ${data[glassIndex]}`);
    }
  });

  // Create NBT structure
  const nbtData = {
    name: 'Schematic',
    value: {
      Width: { type: 'short', value: width },
      Height: { type: 'short', value: height },
      Length: { type: 'short', value: length },
      Materials: { type: 'string', value: 'Alpha' },
      Blocks: { type: 'byteArray', value: blocks },
      Data: { type: 'byteArray', value: data },
      WEOffsetX: { type: 'int', value: 0 },
      WEOffsetY: { type: 'int', value: 0 },
      WEOffsetZ: { type: 'int', value: 0 },
      Entities: { type: 'list', value: { type: 'compound', value: [] } },
      TileEntities: { type: 'list', value: { type: 'compound', value: [] } }
    }
  };

  // Write NBT data
  function writeNBT(data) {
    const buffer = [];
    buffer.push(0x0A); // Compound tag start
    writeString(data.name || 'Schematic', buffer);
    writeCompoundContent(data.value, buffer);
    return new Uint8Array(buffer);
  }

  function writeCompoundContent(compound, buffer) {
    for (const [key, tag] of Object.entries(compound)) {
      writeNBTTag(tag, key, buffer);
    }
    buffer.push(0x00); // End tag
  }

  function writeNBTTag(tag, name, buffer) {
    const tagId = getTagId(tag.type);
    buffer.push(tagId);
    writeString(name, buffer);

    switch (tag.type) {
      case 'short':
        writeInt16(tag.value, buffer);
        break;
      case 'int':
        writeInt32(tag.value, buffer);
        break;
      case 'string':
        writeString(tag.value, buffer);
        break;
      case 'byteArray':
        writeInt32(tag.value.length, buffer);
        for (let i = 0; i < tag.value.length; i++) {
          buffer.push(tag.value[i] & 0xFF);
        }
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

  function writeInt32(value, buffer) {
    buffer.push(
      (value >> 24) & 0xFF,
      (value >> 16) & 0xFF,
      (value >> 8) & 0xFF,
      value & 0xFF
    );
  }

  function writeInt16(value, buffer) {
    buffer.push(
      (value >> 8) & 0xFF,
      value & 0xFF
    );
  }

  function writeString(str, buffer) {
    const bytes = new TextEncoder().encode(str);
    writeInt16(bytes.length, buffer);
    bytes.forEach(byte => buffer.push(byte));
  }

  function getTagId(type) {
    const tagIds = {
      'byte': 0x01,
      'short': 0x02,
      'int': 0x03,
      'string': 0x08,
      'list': 0x09,
      'compound': 0x0A,
      'byteArray': 0x07
    };
    return tagIds[type] || 0x00;
  }

  // Compress and download
  try {
    if (typeof pako === 'undefined') {
      throw new Error('Pako library not found. Please include pako.js.');
    }
    const nbtBuffer = writeNBT(nbtData);
    console.log('NBT buffer size:', nbtBuffer.length);
    const compressed = pako.gzip(nbtBuffer);
    console.log('Compressed size:', compressed.length);
    const blob = new Blob([compressed], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gradient.schematic';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Schematic exported successfully.');
  } catch (err) {
    console.error('Schematic export failed:', err);
    alert('Failed to export schematic: ' + err.message);
  }
}

// Attach event listener
document.getElementById('export-schematic').onclick = exportToSchematic;