export function renderTerrain(editor) {
  const canvas = document.getElementById('terrain-canvas');
  const ctx = canvas.getContext('2d');
  const width = canvas.width = 800;
  const height = canvas.height = 400;

  // Find the output node
  const outputNode = editor.nodes.find(n => n.name === 'Output');
  if (!outputNode || !outputNode.outputs.get('value')) return;

  const outputFunc = outputNode.outputs.get('value').value;
  if (!outputFunc) return;

  // Render heightmap
  const imageData = ctx.createImageData(width, height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const value = outputFunc(x / width * 10, y / height * 10); // Scale coordinates
      const index = (y * width + x) * 4;
      const color = Math.floor((value + 1) * 127.5); // Normalize [-1, 1] to [0, 255]
      imageData.data[index] = color; // R
      imageData.data[index + 1] = color; // G
      imageData.data[index + 2] = color; // B
      imageData.data[index + 3] = 255; // A
    }
  }
  ctx.putImageData(imageData, 0, 0);
}