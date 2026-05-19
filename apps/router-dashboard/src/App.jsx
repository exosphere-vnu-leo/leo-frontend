import React, { useState } from "react";
import RouterDashboard from "./components/RouterDashboard";

function App() {
  // State dùng chung cho toàn bộ hệ thống
  const [activeSat, setActiveSat] = useState("SAT-0123");

  return (
    <div className="min-h-screen bg-slate-950 p-4 space-y-6">
      {/* 1. ROUTER DASHBOARD: Điều khiển việc chuyển đổi vệ tinh (Handover) */}
      <RouterDashboard 
        activeSat={activeSat} 
        setActiveSat={setActiveSat} 
      />
    </div>
  );
}

export default App;