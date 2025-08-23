async function exportToSchematic() {
  const gradient = document.getElementById('gradient');
  const sizeInput = document.getElementById('size');
  const size = parseInt(sizeInput.value) || 16;
  const squares = gradient.querySelectorAll('.gradient-square');
  if (!squares.length) {
    alert('Please generate a gradient first!');
    return;
  }

  // Charger blocks.json + glass.json
  let blocksData, glassData;
  try {
    const [blocksResponse, glassResponse] = await Promise.all([
      fetch('blocks.json'),
      fetch('glass.json')
    ]);
    blocksData = await blocksResponse.json();
    glassData = await glassResponse.json();
  } catch (err) {
    alert("Erreur en chargeant blocks.json / glass.json: " + err.message);
    return;
  }

  // Palette
  const palette = {};
  let paletteIndex = 0;
  function getPaletteIndex(name) {
    if (!(name in palette)) palette[name] = paletteIndex++;
    return palette[name];
  }

  // Dimensions
  const width = size;
  const height = 2;
  const length = size;
  const volume = width * height * length;
  const blockData = new Int32Array(volume).fill(0);

  // Remplissage depuis gradient
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

  console.log(`Palette size=${paletteIndex}, Blocks=${validBlocks}`);

  // NBT structure (Sponge Schematic v3) - STRUCTURE CORRIGÉE
  const nbtData = {
    type: "compound",
    name: "", // ⚠️ Racine ANONYME
    value: {
      Schematic: { // ⚠️ Le tag "Schematic" est À L'INTÉRIEUR de la racine
        type: "compound",
        value: {
          Version: { type: "int", value: 3 }, // v3
          DataVersion: { type: "int", value: 4189 }, // 1.21.4
          Width: { type: "short", value: width },
          Height: { type: "short", value: height },
          Length: { type: "short", value: length },
          Offset: { type: "intArray", value: [0, 0, 0] },
          
          // Structure Blocks (v3)
          Blocks: {
            type: "compound",
            value: {
              Palette: {
                type: "compound",
                value: Object.fromEntries(
                  Object.entries(palette).map(([name, idx]) => [
                    name, { type: "int", value: idx }
                  ])
                )
              },
              Data: { type: "byteArray", value: Array.from(blockData) },
              BlockEntities: { type: "list", value: { type: "compound", value: [] } }
            }
          },
          
          // Métadonnées WorldEdit (v3)
          Metadata: {
            type: "compound",
            value: {
              WorldEdit: {
                type: "compound",
                value: {
                  Platforms: {
                    type: "compound",
                    value: {
                      "intellectualsites:bukkit": {
                        type: "compound",
                        value: {
                          Name: { type: "string", value: "Bukkit-Official" },
                          Version: { type: "string", value: "2.12.3" }
                        }
                      }
                    }
                  },
                  EditingPlatform: { type: "string", value: "intellectualsites.bukkit" },
                  Version: { type: "string", value: "2.12.3" },
                  Origin: { type: "intArray", value: [0, 0, 0] }
                }
              },
              Date: { type: "long", value: Date.now() } // Timestamp en millisecondes
            }
          }
        }
      }
    }
  };

  // --- NBT Writer (avec support long) ---
  function writeNBT(root) {
    const buffer = [];
    writeTag(root, buffer);
    return new Uint8Array(buffer);
  }

  function writeTag(tag, buffer, name = tag.name) {
    const tagId = getTagId(tag.type);
    buffer.push(tagId);
    writeString(name, buffer);

    switch (tag.type) {
      case "int": writeInt32(tag.value, buffer); break;
      case "short": writeInt16(tag.value, buffer); break;
      case "long": writeLong(tag.value, buffer); break; // ⚠️ Nouveau
      case "string": writeString(tag.value, buffer); break;
      case "byteArray":
        writeInt32(tag.value.length, buffer);
        tag.value.forEach(v => buffer.push(v & 0xff));
        break;
      case "intArray":
        writeInt32(tag.value.length, buffer);
        tag.value.forEach(v => writeInt32(v, buffer));
        break;
      case "compound":
        for (const [k, v] of Object.entries(tag.value)) {
          writeTag(v, buffer, k);
        }
        buffer.push(0x00); // TAG_End
        break;
      case "list":
        buffer.push(getTagId(tag.value.type));
        writeInt32(tag.value.value.length, buffer);
        if (tag.value.type === "compound") {
          tag.value.value.forEach(item => {
            for (const [k, v] of Object.entries(item)) {
              writeTag(v, buffer, k);
            }
            buffer.push(0x00);
          });
        }
        break;
    }
  }

  function writeInt16(val, buffer) {
    buffer.push((val >> 8) & 0xff, val & 0xff);
  }

  function writeInt32(val, buffer) {
    buffer.push(
      (val >> 24) & 0xff,
      (val >> 16) & 0xff,
      (val >> 8) & 0xff,
      val & 0xff
    );
  }

  // ⚠️ Support des long (8 octets)
  function writeLong(val, buffer) {
    // JavaScript ne gère pas bien les entiers 64-bit
    // On utilise BigInt si nécessaire, sinon on split en 2×32bit
    if (typeof val === 'bigint') {
      const high = Number(val >> 32n);
      const low = Number(val & 0xffffffffn);
      writeInt32(high, buffer);
      writeInt32(low, buffer);
    } else {
      // Pour les timestamps normaux, la partie haute est 0
      writeInt32(Math.floor(val / 0x100000000), buffer); // High
      writeInt32(val & 0xffffffff, buffer); // Low
    }
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
      long: 4,
      string: 8,
      list: 9,
      compound: 10,
      intArray: 11,
      byteArray: 7 // ⚠️ TAG_Byte_Array
    }[type] || 0;
  }

  // Compression GZIP
  try {
    const nbtBuffer = writeNBT(nbtData);
    console.log(`NBT buffer size: ${nbtBuffer.length} bytes`);
    console.log(`First 32 bytes:`, Array.from(nbtBuffer.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    
    const compressed = pako.gzip(nbtBuffer);
    console.log(`Compressed size: ${compressed.length} bytes`);
    
    const blob = new Blob([compressed], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gradient.schem";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert(`.schem v3 exported! ${validBlocks} blocks processed.`);
  } catch (err) {
    alert("Export failed: " + err.message);
    console.error(err);
  }
}

document.getElementById("export-schematic").onclick = exportToSchematic;