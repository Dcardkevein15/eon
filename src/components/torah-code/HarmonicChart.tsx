
'use client';

import type { HarmonicAnalysis } from '@/lib/types';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, ReferenceLine } from 'recharts';
import { format, fromUnixTime } from 'date-fns';
import { es } from 'date-fns/locale';

interface HarmonicChartProps {
  data: HarmonicAnalysis['resonanceData'];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="p-2 bg-background/80 border rounded-lg shadow-xl text-xs">
        <p className="font-bold">{`Segmento ${label}`}</p>
        <p>Libro: <span className="font-semibold">{dataPoint.book}</span></p>
        <p style={{ color: payload[0].color }}>
          {`Resonancia: ${dataPoint.score.toFixed(2)}`}
        </p>
      </div>
    );
  }
  return null;
};

const bookColors: Record<string, string> = {
    'Génesis': 'hsl(var(--chart-1))',
    'Éxodo': 'hsl(var(--chart-2))',
    'Levítico': 'hsl(var(--chart-3))',
    'Números': 'hsl(var(--chart-4))',
    'Deuteronomio': 'hsl(var(--chart-5))',
};


export default function HarmonicChart({ data }: HarmonicChartProps) {

  return (
     <div className="h-96 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 5, right: 20, left: -10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
          <XAxis 
            dataKey="segment" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            label={{ value: "Segmentos de la Torá", position: 'insideBottom', offset: -15, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            domain={[0, 10]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            label={{ value: "Intensidad", angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(value) => <span className="text-muted-foreground">{value}</span>} />
            <defs>
                {Object.entries(bookColors).map(([book, color]) => (
                    <linearGradient key={book} id={`color${book}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                ))}
            </defs>
            {Object.keys(bookColors).map((book) => (
                 <Area
                    key={book}
                    type="monotone"
                    dataKey={(payload) => payload.book === book ? payload.score : null}
                    stroke={bookColors[book]}
                    fill={`url(#color${book})`}
                    name={book}
                    stackId="1"
                    strokeWidth={2}
                 />
            ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
