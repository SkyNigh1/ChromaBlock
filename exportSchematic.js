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

  // Create comprehensive block mappings from JSON data
  const blockNameToId = {};
  const blockDataValues = {};

  // Enhanced mapping function using patterns and keywords
  function getBlockMapping(blockName) {
    const name = blockName.toLowerCase().trim();
    
    // Direct mappings for common blocks
    const directMappings = {
      'stone': { id: 1, data: 0 },
      'grass_block': { id: 2, data: 0 },
      'dirt': { id: 3, data: 0 },
      'cobblestone': { id: 4, data: 0 },
      'oak_planks': { id: 5, data: 0 },
      'bedrock': { id: 7, data: 0 },
      'sand': { id: 12, data: 0 },
      'gravel': { id: 13, data: 0 },
      'coal_ore': { id: 16, data: 0 },
      'iron_ore': { id: 15, data: 0 },
      'gold_ore': { id: 14, data: 0 },
      'iron_block': { id: 42, data: 0 },
      'gold_block': { id: 41, data: 0 },
      'diamond_block': { id: 57, data: 0 },
      'furnace': { id: 61, data: 0 },
      'redstone_ore': { id: 73, data: 0 },
      'netherrack': { id: 87, data: 0 },
      'coal_block': { id: 173, data: 0 },
      'quartz_block': { id: 155, data: 0 },
      'observer': { id: 218, data: 0 },
      'magma_block': { id: 213, data: 0 },
      'bone_block': { id: 216, data: 0 },
      'nether_bricks': { id: 112, data: 0 },
      'red_nether_bricks': { id: 215, data: 0 },
      'end_stone': { id: 121, data: 0 },
      'purpur_block': { id: 201, data: 0 },
      'blast_furnace': { id: 451, data: 0 },
      'smoker': { id: 453, data: 0 },
      'cartography_table': { id: 455, data: 0 },
      'smithing_table': { id: 457, data: 0 },
      'loom': { id: 459, data: 0 },
      'barrel': { id: 458, data: 0 },
      'composter': { id: 468, data: 0 },
      'crimson_nylium': { id: 487, data: 0 },
      'warped_nylium': { id: 488, data: 0 },
      'ancient_debris': { id: 526, data: 0 },
      'netherite_block': { id: 525, data: 0 },
      'blackstone': { id: 528, data: 0 },
      'basalt': { id: 489, data: 0 },
      'soul_sand': { id: 88, data: 0 },
      'soul_soil': { id: 491, data: 0 },
      'deepslate': { id: 633, data: 0 },
      'copper_block': { id: 601, data: 0 },
      'raw_copper_block': { id: 707, data: 0 },
      'raw_iron_block': { id: 706, data: 0 },
      'raw_gold_block': { id: 708, data: 0 },
      'amethyst_block': { id: 626, data: 0 },
      'tuff': { id: 588, data: 0 },
      'calcite': { id: 581, data: 0 },
      'dripstone_block': { id: 615, data: 0 },
      'moss_block': { id: 575, data: 0 },
      'rooted_dirt': { id: 576, data: 0 },
      'mud': { id: 717, data: 0 },
      'packed_mud': { id: 718, data: 0 },
      'mud_bricks': { id: 719, data: 0 },
      'reinforced_deepslate': { id: 721, data: 0 }
    };

    if (directMappings[name]) {
      return directMappings[name];
    }

    // Pattern-based mappings
    if (name.includes('log') || name.includes('stem')) {
      if (name.includes('oak')) return { id: 17, data: 0 };
      if (name.includes('spruce')) return { id: 17, data: 1 };
      if (name.includes('birch')) return { id: 17, data: 2 };
      if (name.includes('jungle')) return { id: 17, data: 3 };
      if (name.includes('acacia')) return { id: 162, data: 0 };
      if (name.includes('dark_oak')) return { id: 162, data: 1 };
      if (name.includes('mangrove')) return { id: 476, data: 0 };
      if (name.includes('cherry')) return { id: 478, data: 0 };
      if (name.includes('pale_oak')) return { id: 480, data: 0 };
      if (name.includes('crimson')) return { id: 481, data: 0 };
      if (name.includes('warped')) return { id: 482, data: 0 };
      return { id: 17, data: 0 }; // Default to oak log
    }

    if (name.includes('planks')) {
      if (name.includes('oak')) return { id: 5, data: 0 };
      if (name.includes('spruce')) return { id: 5, data: 1 };
      if (name.includes('birch')) return { id: 5, data: 2 };
      if (name.includes('jungle')) return { id: 5, data: 3 };
      if (name.includes('acacia')) return { id: 5, data: 4 };
      if (name.includes('dark_oak')) return { id: 5, data: 5 };
      return { id: 5, data: 0 }; // Default to oak planks
    }

    if (name.includes('wool')) {
      const woolColors = {
        'white': 0, 'orange': 1, 'magenta': 2, 'light_blue': 3,
        'yellow': 4, 'lime': 5, 'pink': 6, 'gray': 7,
        'light_gray': 8, 'cyan': 9, 'purple': 10, 'blue': 11,
        'brown': 12, 'green': 13, 'red': 14, 'black': 15
      };
      for (const [color, data] of Object.entries(woolColors)) {
        if (name.includes(color)) return { id: 35, data };
      }
      return { id: 35, data: 0 }; // Default to white wool
    }

    if (name.includes('concrete')) {
      const concreteColors = {
        'white': 0, 'orange': 1, 'magenta': 2, 'light_blue': 3,
        'yellow': 4, 'lime': 5, 'pink': 6, 'gray': 7,
        'light_gray': 8, 'cyan': 9, 'purple': 10, 'blue': 11,
        'brown': 12, 'green': 13, 'red': 14, 'black': 15
      };
      for (const [color, data] of Object.entries(concreteColors)) {
        if (name.includes(color)) return { id: 251, data };
      }
      return { id: 251, data: 0 }; // Default to white concrete
    }

    if (name.includes('terracotta')) {
      const terracottaColors = {
        'white': 0, 'orange': 1, 'magenta': 2, 'light_blue': 3,
        'yellow': 4, 'lime': 5, 'pink': 6, 'gray': 7,
        'light_gray': 8, 'cyan': 9, 'purple': 10, 'blue': 11,
        'brown': 12, 'green': 13, 'red': 14, 'black': 15
      };
      for (const [color, data] of Object.entries(terracottaColors)) {
        if (name.includes(color)) return { id: 159, data };
      }
      return { id: 172, data: 0 }; // Hardened clay for plain terracotta
    }

    if (name.includes('coral')) {
      if (name.includes('dead')) return { id: 133, data: 0 }; // Dead coral -> cobblestone variant
      return { id: 387, data: 0 }; // Live coral blocks
    }

    if (name.includes('copper')) {
      if (name.includes('exposed')) return { id: 602, data: 0 };
      if (name.includes('weathered')) return { id: 603, data: 0 };
      if (name.includes('oxidized')) return { id: 604, data: 0 };
      if (name.includes('cut')) return { id: 605, data: 0 };
      if (name.includes('bulb')) return { id: 610, data: 0 };
      return { id: 601, data: 0 }; // Default copper block
    }

    if (name.includes('deepslate')) {
      if (name.includes('coal_ore')) return { id: 661, data: 0 };
      if (name.includes('iron_ore')) return { id: 662, data: 0 };
      if (name.includes('copper_ore')) return { id: 663, data: 0 };
      if (name.includes('gold_ore')) return { id: 664, data: 0 };
      if (name.includes('redstone_ore')) return { id: 665, data: 0 };
      if (name.includes('emerald_ore')) return { id: 666, data: 0 };
      if (name.includes('lapis_ore')) return { id: 667, data: 0 };
      if (name.includes('diamond_ore')) return { id: 668, data: 0 };
      if (name.includes('bricks')) return { id: 646, data: 0 };
      if (name.includes('tiles')) return { id: 647, data: 0 };
      if (name.includes('chiseled')) return { id: 648, data: 0 };
      return { id: 633, data: 0 }; // Default deepslate
    }

    if (name.includes('sandstone')) {
      if (name.includes('red')) return { id: 179, data: 0 };
      if (name.includes('chiseled')) return { id: 24, data: 1 };
      if (name.includes('smooth')) return { id: 24, data: 2 };
      return { id: 24, data: 0 }; // Default sandstone
    }

    // Special blocks
    if (name.includes('glowstone')) return { id: 89, data: 0 };
    if (name.includes('redstone_lamp')) return { id: 123, data: 0 };
    if (name.includes('pumpkin')) return { id: 86, data: 0 };
    if (name.includes('melon')) return { id: 103, data: 0 };
    if (name.includes('hay')) return { id: 170, data: 0 };
    if (name.includes('slime')) return { id: 165, data: 0 };
    if (name.includes('honey')) return { id: 475, data: 0 };
    if (name.includes('target')) return { id: 473, data: 0 };
    if (name.includes('lodestone')) return { id: 493, data: 0 };
    if (name.includes('crying_obsidian')) return { id: 492, data: 0 };
    if (name.includes('respawn_anchor')) return { id: 494, data: 0 };
    if (name.includes('shroomlight')) return { id: 485, data: 0 };

    // Default fallback
    console.warn(`Unknown block: ${name}, using stone as fallback`);
    return { id: 1, data: 0 }; // Stone
  }

  // Process all blocks and glass from JSON to create mappings
  blocksData.forEach(block => {
    const mapping = getBlockMapping(block.name);
    blockNameToId[block.name] = mapping.id;
    blockDataValues[block.name] = mapping.data;
  });

  // Glass blocks mapping
  glassData.forEach(glass => {
    if (glass.name === 'none') {
      blockNameToId[glass.name] = 0; // Air
      blockDataValues[glass.name] = 0;
    } else {
      const glassColors = {
        'white_stained_glass': 0, 'orange_stained_glass': 1, 'magenta_stained_glass': 2,
        'light_blue_stained_glass': 3, 'yellow_stained_glass': 4, 'lime_stained_glass': 5,
        'pink_stained_glass': 6, 'gray_stained_glass': 7, 'light_gray_stained_glass': 8,
        'cyan_stained_glass': 9, 'purple_stained_glass': 10, 'blue_stained_glass': 11,
        'brown_stained_glass': 12, 'green_stained_glass': 13, 'red_stained_glass': 14,
        'black_stained_glass': 15
      };
      
      blockNameToId[glass.name] = 95; // Stained glass ID
      blockDataValues[glass.name] = glassColors[glass.name] || 0;
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
  let validBlocks = 0;
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

    // Parse tooltip to extract block names
    if (tooltip.startsWith('Color:')) {
      // Handle exact color mode - use stone as base
      baseName = 'stone';
    } else {
      const baseMatch = tooltip.match(/Base: ([^,]+)/);
      const glassMatch = tooltip.match(/Glass: ([^,]+)/);

      if (baseMatch) {
        baseName = baseMatch[1].trim();
      }

      if (glassMatch && glassMatch[1].trim() !== 'none') {
        glassName = glassMatch[1].trim();
      }
    }

    // Set base block
    const baseBlockId = blockNameToId[baseName] || 1;
    const baseDataValue = blockDataValues[baseName] || 0;
    const baseIndex = x + z * width + 0 * width * length;
    blocks[baseIndex] = baseBlockId;
    data[baseIndex] = baseDataValue;
    validBlocks++;

    console.log(`Base block at (${x}, 0, ${z}): ${baseName} -> ID=${baseBlockId}, Data=${baseDataValue}`);

    // Set glass block (if any)
    if (glassName) {
      const glassBlockId = blockNameToId[glassName] || 0;
      const glassDataValue = blockDataValues[glassName] || 0;
      const glassIndex = x + z * width + 1 * width * length;
      blocks[glassIndex] = glassBlockId;
      data[glassIndex] = glassDataValue;
      console.log(`Glass block at (${x}, 1, ${z}): ${glassName} -> ID=${glassBlockId}, Data=${glassDataValue}`);
    }
  });

  console.log(`Successfully processed ${validBlocks} blocks out of ${squares.length} squares`);

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

  // Write NBT data (keeping your existing NBT writing functions)
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
    alert(`Schematic exported successfully! Processed ${validBlocks} blocks.`);
  } catch (err) {
    console.error('Schematic export failed:', err);
    alert('Failed to export schematic: ' + err.message);
  }
}

// Attach event listener
document.getElementById('export-schematic').onclick = exportToSchematic;