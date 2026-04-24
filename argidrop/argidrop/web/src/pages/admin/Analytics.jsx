import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
const C = { blue:'#2563EB', orange:'#F97316', green:'#16A34A', surface:'#111827', raised:'#1C2333', border:'#253044', txt:'#F1F5F9', muted:'#94A3B8', dim:'#64748B' };
export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  useEffect(()=>{ api.get('/admin/analytics').then(r=>setData(r.data)).catch(()=>{}); },[]);
  const monthly = data?.monthlyRevenue||[];
  const byStatus = data?.byStatus||{};
  const statusData = Object.entries(byStatus).map(([s,c])=>({name:s,count:c}));
  const tooltipStyle = { background:C.raised, border:`1px solid ${C.border}`, borderRadius:9, fontSize:12 };
  return (
    <div>
      <div style={{marginBottom:24}}><h1 style={{fontFamily:'Plus Jakarta Sans',fontSize:22,fontWeight:800,marginBottom:2}}>Analytics</h1><p style={{fontSize:13,color:C.dim}}>Platform revenue and delivery performance</p></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:22}}>
          <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:16}}>Monthly GMV & Commission (6mo)</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly} margin={{top:4,right:4,bottom:4,left:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:C.dim}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:C.dim}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={tooltipStyle} labelStyle={{color:C.muted}} itemStyle={{color:C.txt}}/>
              <Bar dataKey="gmv" name="GMV ($)" fill={C.blue} radius={[4,4,0,0]}/>
              <Bar dataKey="commission" name="Commission ($)" fill={C.orange} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:22}}>
          <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:16}}>Deliveries by Status</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} layout="vertical" margin={{top:4,right:20,bottom:4,left:20}}>
              <XAxis type="number" tick={{fontSize:11,fill:C.dim}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:10,fill:C.dim}} axisLine={false} tickLine={false} width={80}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <Bar dataKey="count" name="Jobs" fill={C.green} radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:22}}>
        <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:16}}>Monthly Deliveries Trend</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
            <XAxis dataKey="month" tick={{fontSize:11,fill:C.dim}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:11,fill:C.dim}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={tooltipStyle}/>
            <Line type="monotone" dataKey="deliveries" name="Deliveries" stroke={C.green} strokeWidth={2} dot={{fill:C.green,r:4}} activeDot={{r:6}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
