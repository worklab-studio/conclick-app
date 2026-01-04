'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useMessages } from '@/components/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { formatLongNumber } from '@/lib/format';

const COLORS = ['#2680eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export function ChannelChart({ data }: { data: any[] }) {
    const { formatMessage, labels } = useMessages();

    const chartData = useMemo(() => {
        if (!data) return [];
        return data.map((item, index) => ({
            name: item.x,
            value: item.y,
            fill: COLORS[index % COLORS.length],
        })).sort((a, b) => b.value - a.value);
    }, [data]);

    if (!data || data.length === 0) {
        return <div className="text-center text-zinc-500 py-8">No data available</div>;
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e4e4e7',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        itemStyle={{ fontSize: '14px', fontWeight: 500, color: '#18181b' }}
                        formatter={(value: number) => formatLongNumber(value)}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconType="circle"
                        formatter={(value, entry: any) => (
                            <span className="text-zinc-600 text-sm ml-2">{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
