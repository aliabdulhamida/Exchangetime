import React from 'react';
import { Sankey, Tooltip, ResponsiveContainer } from 'recharts';

interface SankeyNode {
  name: string;
}
interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyRechartsProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  height?: number;
}

export const SankeyRecharts: React.FC<SankeyRechartsProps> = ({ nodes, links, height = 400 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey
        width={700}
        height={height}
        data={{ nodes, links }}
        nodePadding={24}
        nodeWidth={20}
        linkCurvature={0.5}
        margin={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Tooltip />
      </Sankey>
    </ResponsiveContainer>
  );
};
