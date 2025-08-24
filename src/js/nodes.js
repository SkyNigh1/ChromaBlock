import { noise } from 'https://cdn.jsdelivr.net/npm/noisejs@2.1.0/noise.min.js';

export function initNodes() {
  class PerlinNoiseComponent extends Rete.Component {
    constructor() {
      super('Perlin Noise');
    }

    builder(node) {
      node.addOutput(new Rete.Output('value', 'Value', Rete.Socket));
      node.addControl(new Rete.Control('seed', { type: 'number', value: 0 }));
      node.addControl(new Rete.Control('scale', { type: 'number', value: 0.05 }));
      return node;
    }

    worker(node, inputs, outputs) {
      noise.seed(node.data.seed || 0);
      outputs['value'] = (x, y) => noise.perlin2(x * node.data.scale, y * node.data.scale);
    }
  }

  class ScaleComponent extends Rete.Component {
    constructor() {
      super('Scale');
    }

    builder(node) {
      node.addInput(new Rete.Input('value', 'Value', Rete.Socket));
      node.addOutput(new Rete.Output('value', 'Value', Rete.Socket));
      node.addControl(new Rete.Control('factor', { type: 'number', value: 1 }));
      return node;
    }

    worker(node, inputs, outputs) {
      const input = inputs['value'][0];
      if (input) {
        outputs['value'] = (x, y) => input(x, y) * node.data.factor;
      }
    }
  }

  class AddComponent extends Rete.Component {
    constructor() {
      super('Add');
    }

    builder(node) {
      node.addInput(new Rete.Input('value1', 'Value 1', Rete.Socket));
      node.addInput(new Rete.Input('value2', 'Value 2', Rete.Socket));
      node.addOutput(new Rete.Output('value', 'Value', Rete.Socket));
      return node;
    }

    worker(node, inputs, outputs) {
      const input1 = inputs['value1'][0];
      const input2 = inputs['value2'][0];
      if (input1 && input2) {
        outputs['value'] = (x, y) => input1(x, y) + input2(x, y);
      }
    }
  }

  class ClampComponent extends Rete.Component {
    constructor() {
      super('Clamp');
    }

    builder(node) {
      node.addInput(new Rete.Input('value', 'Value', Rete.Socket));
      node.addOutput(new Rete.Output('value', 'Value', Rete.Socket));
      node.addControl(new Rete.Control('min', { type: 'number', value: 0 }));
      node.addControl(new Rete.Control('max', { type: 'number', value: 1 }));
      return node;
    }

    worker(node, inputs, outputs) {
      const input = inputs['value'][0];
      if (input) {
        outputs['value'] = (x, y) => Math.min(Math.max(input(x, y), node.data.min), node.data.max);
      }
    }
  }

  class OutputComponent extends Rete.Component {
    constructor() {
      super('Output');
    }

    builder(node) {
      node.addInput(new Rete.Input('value', 'Value', Rete.Socket));
      return node;
    }

    worker(node, inputs, outputs) {
      outputs['value'] = inputs['value'][0];
    }
  }

  // Custom control for numbers
  class NumberControl extends Rete.Control {
    constructor(key, { type, value }) {
      super(key);
      this.key = key;
      this.type = type;
      this.value = value;
    }

    render = 'js';
    component = {
      template: `<input type="number" :value="value" @input="change($event)" />`,
      data() {
        return { value: this.value };
      },
      methods: {
        change(e) {
          this.value = +e.target.value;
          this.node.data[this.key] = this.value;
          this.emitter.trigger('process');
        }
      }
    };
  }

  Rete.Control = NumberControl;

  return [
    new PerlinNoiseComponent(),
    new ScaleComponent(),
    new AddComponent(),
    new ClampComponent(),
    new OutputComponent()
  ];
}