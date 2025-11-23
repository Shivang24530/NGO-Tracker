
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Legend } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import type { Child, Household } from '@/lib/types';
import { useMemo } from 'react';
import { calculateAge } from '@/lib/utils';


const CHART_COLORS = {
  blue: 'hsl(var(--chart-1))',
  pink: 'hsl(var(--chart-2))',
  green: 'hsl(var(--chart-3))',
  purple: 'hsl(var(--chart-4))',
  orange: 'hsl(var(--chart-5))',
};

const PIE_COLORS = [CHART_COLORS.orange, CHART_COLORS.blue, CHART_COLORS.pink, CHART_COLORS.green, CHART_COLORS.purple];

interface ChartProps<T> {
  data: T[];
}

export function GenderChart({ data }: ChartProps<Child>) {
  const chartData = useMemo(() => {
    return data.reduce((acc, child) => {
      const gender = child.gender;
      const existing = acc.find(item => item.name === gender);
      if(existing) {
          existing.value += 1;
      } else {
          acc.push({ name: gender, value: 1 });
      }
      return acc;
    }, [] as { name: string, value: number }[]);
  }, [data]);

  const chartConfig = {
    value: { label: 'Children' },
    Male: { label: 'Male', color: CHART_COLORS.blue },
    Female: { label: 'Female', color: CHART_COLORS.pink },
    Other: { label: 'Other', color: CHART_COLORS.purple },
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
             {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent />} />
        </PieChart>
    </ChartContainer>
  );
}

export function LocationChart({ data }: ChartProps<Household>) {
    const chartData = useMemo(() => {
        return data.reduce((acc, household) => {
            const location = household.locationArea;
            const existing = acc.find(item => item.location === location);
            if(existing) {
                existing.families += 1;
            } else {
                acc.push({ location: location, families: 1 });
            }
            return acc;
        }, [] as { location: string, families: number }[]).sort((a,b) => b.families - a.families).slice(0, 10);
    }, [data]);

    const chartConfig = {
        families: {
            label: 'Families',
            color: 'hsl(var(--chart-1))',
        },
    }

    return (
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="location"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
             <XAxis type="number" dataKey="families" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="families" fill="var(--color-families)" radius={4} />
          </BarChart>
        </ChartContainer>
    )
}

export function AgeGroupChart({ data }: ChartProps<Child>) {
  const chartData = useMemo(() => {
    const ageGroups = {
      '0-5': 0,
      '6-10': 0,
      '11-14': 0,
      '15-18': 0,
      '18+': 0,
    };

    data.forEach(child => {
      const age = calculateAge(child.dateOfBirth);
      if (age <= 5) ageGroups['0-5']++;
      else if (age <= 10) ageGroups['6-10']++;
      else if (age <= 14) ageGroups['11-14']++;
      else if (age <= 18) ageGroups['15-18']++;
      else ageGroups['18+']++;
    });

    return Object.entries(ageGroups).map(([name, value]) => ({ name, children: value }));
  }, [data]);

  const chartConfig = {
    children: {
      label: 'Children',
      color: CHART_COLORS.orange,
    },
  };

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="children" fill="var(--color-children)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

export function StudyStatusChart({ data }: ChartProps<Child>) {
  const chartData = useMemo(() => {
    const status = {
      'Studying': 0,
      'Not Studying': 0,
    };
    data.forEach(child => {
      if (child.isStudying) status['Studying']++;
      else status['Not Studying']++;
    });
    return Object.entries(status).map(([name, value]) => ({ name, children: value }));
  }, [data]);

  const chartConfig = {
    children: {
      label: 'Children',
      color: CHART_COLORS.green,
    },
  };

  return (
    <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="name"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
        />
        <YAxis />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="children" fill="var(--color-children)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
