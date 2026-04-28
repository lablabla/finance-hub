import React from 'react';
import NetWorthCard from '../components/Dashboard/NetWorthCard.jsx';
import NetWorthChart from '../components/Dashboard/NetWorthChart.jsx';
import AssetBreakdown from '../components/Dashboard/AssetBreakdown.jsx';
import SpendingChart from '../components/Dashboard/SpendingChart.jsx';
import RecentTransactions from '../components/Dashboard/RecentTransactions.jsx';
import './Dashboard.css';

export default function Dashboard() {
  return (
    <div className="dashboard">
      <h1 className="page-title">Dashboard</h1>
      <NetWorthCard />
      <div className="dashboard-grid">
        <NetWorthChart />
        <AssetBreakdown />
      </div>
      <SpendingChart />
      <RecentTransactions />
    </div>
  );
}
