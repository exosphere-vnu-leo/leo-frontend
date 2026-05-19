import { useState } from "react";
import GatewayDashboard from "./components/GatewayDashboard";

function App() {
  // State dùng chung cho toàn bộ hệ thống
  const [activeSat] = useState("SAT-0123");

  return (
    <div className="h-screen min-h-0 overflow-hidden bg-slate-950 p-4 space-y-6">
      {/* 2. GATEWAY DASHBOARD: Nhận tín hiệu để vẽ quả địa cầu 3D */}
      <GatewayDashboard 
        activeSat={activeSat} 
      />
    </div>
  );
}

export default App;