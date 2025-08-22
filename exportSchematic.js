function exportToSchematic() {
  const gradient = document.getElementById('gradient');
  const sizeInput = document.getElementById('size');
  const size = parseInt(sizeInput.value) || 16;
  const squares = gradient.querySelectorAll('.gradient-square');
  if (!squares.length) {
    alert('Please generate a gradient first!');
    return;
  }

  // Initialize schematic dimensions
  const width = size;
  const height = 2; // Base layer (y=0) and glass layer (y=1)
  const length = size;
  const volume = width * height * length;
  const blocks = new Uint8Array(volume).fill(0); // Default to air
  const data = new Uint8Array(volume).fill(0); // Block metadata (0 for simplicity)

  // Simplified block ID mapping (legacy IDs for .schematic compatibility)
  const blockNameToId = {
    'redstone_ore': 73,
    'blast_furnace': 451,
    'coal_block': 173,
    'red_concrete': 251, // Data value 14 for red
    'stripped_mangrove_log': 17, // Log with data for mangrove
    'iron_block': 42,
    'suspicious_gravel': 438,
    'furnace': 61,
    'cobblestone': 4,
    'netherrack': 87,
    'coal_ore': 16,
    'observer': 218,
    'crimson_nylium': 487,
    'stone': 1,
    'chiseled_deepslate': 648,
    'grass_block': 2,
    'smooth_stone': 1, // Same as stone, differentiated by texture in game
    'smooth_stone_slab': 44, // Slab with data for smooth stone
    'crafter': 454,
    'netherite_block': 525,
    'stripped_crimson_stem': 17, // Log with data for crimson
    'pink_concrete_powder': 252, // Data value 6 for pink
    'pink_concrete': 251, // Data value 6 for pink
    'pearlescent_froglight': 549,
    'pink_glazed_terracotta': 231,
    'crimson_stem': 17, // Log with data for crimson
    'purple_terracotta': 159, // Data value 10 for purple
    'magenta_terracotta': 159, // Data value 2 for magenta
    'pink_wool': 35, // Data value 6 for pink
    'mycelium': 110,
    'nether_bricks': 112,
    'chiseled_nether_bricks': 405,
    'cracked_nether_bricks': 406,
    'fire_coral_block': 387,
    'black_glazed_terracotta': 235,
    'smithing_table': 457,
    'stripped_cherry_log': 17, // Log with data for cherry
    'red_nether_bricks': 215,
    'deepslate_redstone_ore': 74,
    'white_stained_glass': 95, // Data value 0 for white
    'orange_stained_glass': 95, // Data value 1 for orange
    'magenta_stained_glass': 95, // Data value 2 for magenta
    'light_blue_stained_glass': 95, // Data value 3 for light blue
    'yellow_stained_glass': 95, // Data value 4 for yellow
    'lime_stained_glass': 95, // Data value 5 for lime
    'pink_stained_glass': 95, // Data value 6 for pink
    'gray_stained_glass': 95, // Data value 7 for gray
    'light_gray_stained_glass': 95, // Data value 8 for light gray
    'cyan_stained_glass': 95, // Data value 9 for cyan
    'purple_stained_glass': 95, // Data value 10 for purple
    'blue_stained_glass': 95, // Data value 11 for blue
    'brown_stained_glass': 95, // Data value 12 for brown
    'green_stained_glass': 95, // Data value 13 for green
    'red_stained_glass': 95, // Data value 14 for red
    'black_stained_glass': 95 // Data value 15 for black
  };

  // Data values for blocks that need them (e.g., colored blocks)
  const blockDataValues = {
    'red_concrete': 14,
    'pink_concrete_powder': 6,
    'pink_concrete': 6,
    'purple_terracotta': 10,
    'magenta_terracotta': 2,
    'pink_wool': 6,
    'white_stained_glass': 0,
    'orange_stained_glass': 1,
    'magenta_stained_glass': 2,
    'light_blue_stained_glass': 3,
    'yellow_stained_glass': 4,
    'lime_stained_glass': 5,
    'pink_stained_glass': 6,
    'gray_stained_glass': 7,
    'light_gray_stained_glass': 8,
    'cyan_stained_glass': 9,
    'purple_stained_glass': 10,
    'blue_stained_glass': 11,
    'brown_stained_glass': 12,
    'green_stained_glass': 13,
    'red_stained_glass': 14,
    'black_stained_glass': 15
  };

  // Parse gradient squares
  squares.forEach((square, index) => {
    const x = index % width;
    const z = Math.floor(index / width);
    const tooltip = square.querySelector('.tooltip').textContent;
    let baseName = 'stone';
    let glassName = null;

    if (tooltip.includes('Base: ')) {
      const parts = tooltip.split(', ');
      baseName = parts[0].replace('Base: ', '');
      if (parts.length > 1 && parts[1].replace('Glass: ', '') !== 'none') {
        glassName = parts[1].replace('Glass: ', '');
      }
    }

    // Set base block
    const baseBlockId = blockNameToId[baseName] || 1; // Default to stone (ID 1)
    const baseIndex = x + z * width + 0 * width * length;
    blocks[baseIndex] = baseBlockId;
    data[baseIndex] = blockDataValues[baseName] || 0;

    // Set glass block (if any)
    if (glassName) {
      const glassBlockId = blockNameToId[glassName] || 0;
      const glassIndex = x + z * width + 1 * width * length;
      blocks[glassIndex] = glassBlockId;
      data[glassIndex] = blockDataValues[glassName] || 0;
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

  // Write NBT data (adapted from script.js)
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
    const compressed = pako.gzip(nbtBuffer);
    const blob = new Blob([compressed], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gradient.schematic';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Schematic export failed:', err);
    alert('Failed to export schematic: ' + err.message);
  }
}

// Attach event listener
document.getElementById('export-schematic').onclick = exportToSchematic;