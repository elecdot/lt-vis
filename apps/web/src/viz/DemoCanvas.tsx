import { useMemo } from 'react';
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import type { ViewState } from './types';
import { toReactFlow } from './reactflow-adapter';

interface DemoCanvasProps {
  state: ViewState;
}

export const DemoCanvas = ({ state }: DemoCanvasProps) => {
  const { nodes, edges } = useMemo(() => toReactFlow(state), [state]);
  return (
    <div style={{ width: '100%', height: 400 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
};
