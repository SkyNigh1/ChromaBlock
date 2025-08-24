import { initNodes } from './nodes.js';
import { renderTerrain } from './render.js';

async function initEditor() {
  const container = document.getElementById('node-editor');
  const editor = new Rete.NodeEditor('terrain@0.1.0', container);
  editor.use(Rete.ConnectionPlugin);
  editor.use(Rete.AreaPlugin);

  const engine = new Rete.Engine('terrain@0.1.0');

  // Initialize nodes
  const components = initNodes();

  // Register components
  components.forEach(c => {
    editor.register(c);
    engine.register(c);
  });

  // Create an output node
  const output = await components[components.length - 1].createNode();
  output.position = [400, 0];
  editor.addNode(output);

  // Update terrain on node changes
  editor.on('process nodecreated noderemoved connectioncreated connectionremoved', async () => {
    await engine.abort();
    await engine.process(editor.toJSON());
    renderTerrain(editor);
  });

  // Initial render
  editor.view.resize();
  editor.trigger('process');
  Rete.AreaPlugin.zoomAt(editor, editor.nodes);
}

document.addEventListener('DOMContentLoaded', initEditor);