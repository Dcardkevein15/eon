'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

type EmotionalStatePoint = {
  date: string;
  sentiment: number;
  summary: string;
  keyEvents: string[];
};

interface EmotionalChartProps {
  data: EmotionalStatePoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const dateLabel = payload[0].payload.date; // Use the original date string

    // Validate date before formatting
    try {
      const parsedDate = parseISO(dateLabel);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date');
      }

      return (
        <Card className="max-w-sm">
          <CardHeader className="p-4">
            <CardTitle className="text-base">
              {format(parsedDate, "eeee, d 'de' MMMM", { locale: es })}
            </CardTitle>
            <CardDescription>{data.summary}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Eventos Clave:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {data.keyEvents.map((event: string, index: number) => (
                <li key={index}>{event}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      );
    } catch (error) {
      // Fallback if date is somehow still invalid
      return (
         <Card className="max-w-sm p-4">
          <p>Error al mostrar fecha.</p>
        </Card>
      );
    }
  }

  return null;
};


export default function EmotionalChart({ data }: EmotionalChartProps) {

  // The data now just needs to be parsed, no pre-formatting needed for the chart component itself
  const formattedData = data.map(item => ({
    ...item,
    date: item.date, // Pass the original ISO string
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{
            top: 5,
            right: 20,
            left: -20,
            bottom: 5,
          }}
        >
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            tickFormatter={(value) => {
              try {
                return format(parseISO(value), 'd MMM', { locale: es })
              } catch (e) {
                return '';
              }
            }}
          />
          <YAxis 
            domain={[-1, 1]} 
            hide 
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--accent))', strokeDasharray: '3 3' }} />
          
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />

          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>

          <Line
            type="monotone"
            dataKey="sentiment"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            fillOpacity={1}
            fill="url(#sentimentGradient)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
