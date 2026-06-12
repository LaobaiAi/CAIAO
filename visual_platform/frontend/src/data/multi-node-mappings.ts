export interface MultiNodeDefinition {
  name: string;
  nodes: {
    componentName: string;
    offsetX: number;
    offsetY: number;
  }[];
  edges: {
    source: string;
    target: string;
  }[];
}

const multiNodeDefinition: Record<string, MultiNodeDefinition> = {
  "Data Pipeline": {
    name: "Data Pipeline",
    nodes: [
      { componentName: "Input Server", offsetX: 0, offsetY: 0 },
      { componentName: "Calculator", offsetX: 400, offsetY: -200 },
      { componentName: "TextProcessor", offsetX: 400, offsetY: 200 },
      { componentName: "Output Server", offsetX: 800, offsetY: 0 },
    ],
    edges: [
      { source: "Input Server", target: "Calculator" },
      { source: "Input Server", target: "TextProcessor" },
      { source: "Calculator", target: "Output Server" },
      { source: "TextProcessor", target: "Output Server" },
    ],
  },
  "Compute Chain": {
    name: "Compute Chain",
    nodes: [
      { componentName: "Input Server", offsetX: 0, offsetY: 0 },
      { componentName: "DataConverter", offsetX: 400, offsetY: -200 },
      { componentName: "MathAnalyzer", offsetX: 400, offsetY: 200 },
      { componentName: "Calculator", offsetX: 800, offsetY: 0 },
      { componentName: "Output Server", offsetX: 1200, offsetY: 0 },
    ],
    edges: [
      { source: "Input Server", target: "DataConverter" },
      { source: "Input Server", target: "MathAnalyzer" },
      { source: "DataConverter", target: "Calculator" },
      { source: "MathAnalyzer", target: "Calculator" },
      { source: "Calculator", target: "Output Server" },
    ],
  },
};

export function getMultiNodeDefinition(name: string): MultiNodeDefinition | null {
  return multiNodeDefinition[name] || null;
}

export function isMultiNodeComponent(componentName: string): boolean {
  return componentName in multiNodeDefinition;
}
