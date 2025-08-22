function exportToSchematic() {
  const gradient = document.getElementById('gradient');
  const sizeInput = document.getElementById('size');
  const size = parseInt(sizeInput.value) || 16;
  const squares = gradient.querySelectorAll('.gradient-square');
  if (!squares.length) {
    alert('Please generate a gradient first!');
    return;
  }

  // Initialize schematic data
  const width = size;
  const height = 2; // Base layer (y=0) and glass layer (y=1)
  const length = size;
  const blockData = new Uint8Array(width * height * length);
  const blockIdMap = {};

  // Minecraft block ID mappings (simplified, add more as needed)
  const blockNameToId = {
    'redstone_ore': 'minecraft:redstone_ore',
    'blast_furnace': 'minecraft:blast_furnace',
    'coal_block': 'minecraft:coal_block',
    'red_concrete': 'minecraft:red_concrete',
    'stripped_mangrove_log': 'minecraft:stripped_mangrove_log',
    'iron_block': 'minecraft:iron_block',
    'suspicious_gravel': 'minecraft:suspicious_gravel',
    'furnace': 'minecraft:furnace',
    'cobblestone': 'minecraft:cobblestone',
    'netherrack': 'minecraft:netherrack',
    'coal_ore': 'minecraft:coal_ore',
    'observer': 'minecraft:observer',
    'crimson_nylium': 'minecraft:crimson_nylium',
    'stone': 'minecraft:stone',
    'chiseled_deepslate': 'minecraft:chiseled_deepslate',
    'grass_block': 'minecraft:grass_block',
    'smooth_stone': 'minecraft:smooth_stone',
    'smooth_stone_slab': 'minecraft:smooth_stone_slab',
    'crafter': 'minecraft:crafter',
    'netherite_block': 'minecraft:netherite_block',
    'stripped_crimson_stem': 'minecraft:stripped_crimson_stem',
    'pink_concrete_powder': 'minecraft:pink_concrete_powder',
    'pink_concrete': 'minecraft:pink_concrete',
    'pearlescent_froglight': 'minecraft:pearlescent_froglight',
    'pink_glazed_terracotta': 'minecraft:pink_glazed_terracotta',
    'crimson_stem': 'minecraft:crimson_stem',
    'purple_terracotta': 'minecraft:purple_terracotta',
    'magenta_terracotta': 'minecraft:magenta_terracotta',
    'pink_wool': 'minecraft:pink_wool',
    'mycelium': 'minecraft:mycelium',
    'nether_bricks': 'minecraft:nether_bricks',
    'chiseled_nether_bricks': 'minecraft:chiseled_nether_bricks',
    'cracked_nether_bricks': 'minecraft:cracked_nether_bricks',
    'fire_coral_block': 'minecraft:fire_coral_block',
    'black_glazed_terracotta': 'minecraft:black_glazed_terracotta',
    'smithing_table': 'minecraft:smithing_table',
    'stripped_cherry_log': 'minecraft:stripped_cherry_log',
    'red_nether_bricks': 'minecraft:red_nether_bricks',
    'deepslate_redstone_ore': 'minecraft:deepslate_redstone_ore',
    'white_stained_glass': 'minecraft:white_stained_glass',
    'orange_stained_glass': 'minecraft:orange_stained_glass',
    'magenta_stained_glass': 'minecraft:magenta_stained_glass',
    'light_blue_stained_glass': 'minecraft:light_blue_stained_glass',
    'yellow_stained_glass': 'minecraft:yellow_stained_glass',
    'lime_stained_glass': 'minecraft:lime_stained_glass',
    'pink_stained_glass': 'minecraft:pink_stained_glass',
    'gray_stained_glass': 'minecraft:gray_stained_glass',
    'light_gray_stained_glass': 'minecraft:light_gray_stained_glass',
    'cyan_stained_glass': 'minecraft:cyan_stained_glass',
    'purple_stained_glass': 'minecraft:purple_stained_glass',
    'blue_stained_glass': 'minecraft:blue_stained_glass',
    'brown_stained_glass': 'minecraft:brown_stained_glass',
    'green_stained_glass': 'minecraft:green_stained_glass',
    'red_stained_glass': 'minecraft:red_stained_glass',
    'black_stained_glass': 'minecraft:black_stained_glass'
  };

  // Assign unique IDs for blocks
  let nextId = 0;
  const palette = {};

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
      if (parts.length > 1) {
        glassName = parts[1].replace('Glass: ', '');
      }
    } else {
      // Handle exact color mode (fallback to stone)
      baseName = 'stone';
    }

    // Map to Minecraft block IDs
    const baseBlockId = blockNameToId[baseName] || 'minecraft:stone';
    const glassBlockId = glassName && glassName !== 'none' ? blockNameToId[glassName] : null;

    // Assign palette IDs
    if (!palette[baseBlockId]) {
      palette[baseBlockId] = nextId++;
    }
    if (glassBlockId && !palette[glassBlockId]) {
      palette[glassBlockId] = nextId++;
    }

    // Set block data
    const baseIndex = x + z * width + 0 * width * length;
    blockData[baseIndex] = palette[baseBlockId];
    if (glassBlockId) {
      const glassIndex = x + z * width + 1 * width * length;
      blockData[glassIndex] = palette[glassBlockId];
    } else {
      const glassIndex = x + z * width + 1 * width * length;
      blockData[glassIndex] = 0; // Air
    }
  });

  // Create NBT-like structure for .schematic
  const schematic = {
    Width: width,
    Height: height,
    Length: length,
    Blocks: blockData,
    Data: new Uint8Array(width * height * length).fill(0), // No block metadata
    Palette: palette,
    Version: 2,
    DataVersion: 2975 // Minecraft 1.18+
  };

  // Convert to binary .schematic format
  const buffer = new ArrayBuffer(1024 * 1024); // 1MB buffer
  let offset = 0;
  const view = new DataView(buffer);

  // Write header
  const encoder = new TextEncoder();
  const writeString = (str) => {
    const bytes = encoder.encode(str);
    view.setInt32(offset, bytes.length, true);
    offset += 4;
    for (let i = 0; i < bytes.length; i++) {
      view.setUint8(offset++, bytes[i]);
    }
  };

  // Write schematic NBT
  writeString('Schematic');
  view.setInt16(offset, schematic.Width, true);
  offset += 2;
  view.setInt16(offset, schematic.Height, true);
  offset += 2;
  view.setInt16(offset, schematic.Length, true);
  offset += 2;
  view.setInt32(offset, schematic.DataVersion, true);
  offset += 4;

  // Write palette
  writeString('Palette');
  view.setInt32(offset, Object.keys(palette).length, true);
  offset += 4;
  for (const blockId in palette) {
    writeString(blockId);
    view.setInt32(offset, palette[blockId], true);
    offset += 4;
  }

  // Write block data
  writeString('BlockData');
  view.setInt32(offset, schematic.Blocks.length, true);
  offset += 4;
  for (let i = 0; i < schematic.Blocks.length; i++) {
    view.setUint8(offset++, schematic.Blocks[i]);
  }

  // Write block entities (empty)
  writeString('BlockEntities');
  view.setInt32(offset, 0, true);
  offset += 4;

  // Create blob and trigger download
  const blob = new Blob([buffer.slice(0, offset)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gradient.schematic';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Attach event listener to export button
document.getElementById('export-schematic').onclick = exportToSchematic;