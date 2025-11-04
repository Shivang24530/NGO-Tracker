'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend, Tooltip as RechartsTooltip } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { children, households } from '@/lib/data';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

// Gender Chart
const genderData = children.reduce((acc, child) => {
    const gender = child.gender;
    const existing = acc.find(item => item.name === gender);
    if(existing) {
        existing.value += 1;
    } else {
        acc.push({ name: gender, value: 1 });
    }
    return acc;
}, [] as { name: string, value: number }[]);

export function GenderChart() {
  const chartConfig = {
    value: { label: 'Children' },
    Male: { label: 'Male', color: 'hsl(var(--chart-1))' },
    Female: { label: 'Female', color: 'hsl(var(--chart-2))' },
    Other: { label: 'Other', color: 'hsl(var(--chart-3))' },
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
             {genderData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent />} />
        </PieChart>
    </ChartContainer>
  );
}


// Location Chart
const locationData = households.reduce((acc, household) => {
    const location = household.locationArea;
    const existing = acc.find(item => item.location === location);
    if(existing) {
        existing.families += 1;
    } else {
        acc.push({ location: location, families: 1 });
    }
    return acc;
}, [] as { location: string, families: number }[]).sort((a,b) => b.families - a.families).slice(0, 10);

export function LocationChart() {
    const chartConfig = {
        families: {
            label: 'Families',
            color: 'hsl(var(--chart-1))',
        },
    }

    return (
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={locationData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="location"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
             <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="families" fill="var(--color-families)" radius={4} />
          </BarChart>
        </ChartContainer>
    )
}
