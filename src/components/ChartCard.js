// File: ChartCard.js (new component)
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardContent, Typography } from '@mui/material';

const ChartCard = ({ title, unit, data, color }) => (
  <Card sx={{ borderRadius: 2, boxShadow: 3, m: 1 }}>
    <CardContent>
      <Typography variant="h6" sx={{ mb: 1 }}>{title} ({unit})</Typography>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={color || '#8884d8'} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export default ChartCard;
