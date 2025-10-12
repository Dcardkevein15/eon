'use client';

import React from 'react';
import { LineChart, Line, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface CardiometerProps {
  sentimentHistory: number[];
}

const Cardiometer: React.FC<CardiometerProps> = ({ sentimentHistory }) => {
    const data = sentimentHistory.map((value, index) => ({ name: index, sentiment: value }));
    // Add padding to the start if there are fewer than 30 data points
    const paddedData = [...Array(Math.max(0, 30 - data.length)).fill({name: -1, sentiment: 0}), ...data];


  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const sentiment = payload[0].value;
      let label = 'Neutral';
      if (sentiment > 0.5) label = 'Muy Positivo';
      else if (sentiment > 0.1) label = 'Positivo';
      else if (sentiment < -0.5) label = 'Muy Negativo';
      else if (sentiment < -0.1) label = 'Negativo';

      return (
        <div className="p-2 bg-background/80 border rounded-lg shadow-xl text-xs">
          <p className="font-bold">{label}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-48 h-16 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <p className="text-xs text-muted-foreground font-semibold">Cardiómetro Emocional</p>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={paddedData}>
          <YAxis domain={[-1, 1]} hide />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <defs>
            <linearGradient id="sentimentGradientCardio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Line
            type="monotone"
            dataKey="sentiment"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            animationDuration={300}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Cardiometer;
