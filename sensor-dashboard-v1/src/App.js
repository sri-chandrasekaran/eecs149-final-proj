// import React, { useState, useEffect, useRef } from 'react';
// import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
// import './Dashboard.css';
// import { ToastContainer, toast } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// export default function Dashboard() {
//   const [sensors, setSensors] = useState({});
//   const [history, setHistory] = useState({});
//   const metrics = ['temperature', 'humidity', 'pressure', 'pm1', 'pm25', 'pm10'];
//   const [activeMetric, setActiveMetric] = useState(metrics[0]); 

//   const accelMagnitude = (x, y, z) => {
//     if (x == null || y == null || z == null) return null;
//     return Math.sqrt(x*x + y*y + z*z);
//   };
  

//   const WILDFIRE_THRESHOLDS = {
//     temperature: 32,  
//     humidity: 30,   
//     pm25: 150,   
//     pm10: 150   
//   };

//   const EARTHQUAKE_THRESHOLDS = {
//     accel_light: 0.05,
//     accel_moderate: 0.1,
//     accel_strong: 0.5,
//     accel_severe: 2.0,
//     accel_violent: 10.0
//   };

//   // -------------------------
//   // 🔥 ALERT RATE LIMITING
//   // -------------------------
//   const lastAlertRef = useRef({
//     wildfire: 0,
//     earthquake: 0
//   });

//   const throttledAlert = (type, fn, cooldown = 10000) => {
//     const now = Date.now();
//     if (now - lastAlertRef.current[type] >= cooldown) {
//       lastAlertRef.current[type] = now;
//       fn();
//     }
//   };
//   // -------------------------

//   useEffect(() => {
//     const interval = setInterval(async () => {
//       try {
//         const res = await fetch("http://172.20.10.2:5000/api/sensors");
//         const data = await res.json();
  
//         const transformed = {};
  
//         // 1️⃣ Build sensor snapshot + alerts
//         Object.entries(data).forEach(([nodeId, nodeData]) => {

//           const accel = accelMagnitude(
//             nodeData.accel_x_ms2,
//             nodeData.accel_y_ms2,
//             nodeData.accel_z_ms2
//           );

//           const node = {
//             temperature: nodeData.temperature_c,
//             humidity: nodeData.humidity,
//             pressure: nodeData.pressure_hpa,
//             pm1: nodeData.pm1,
//             pm25: nodeData.pm25,
//             pm10: nodeData.pm10,
//             // accel,
//             timestamp: nodeData.timestamp
//           };
  
//           transformed[nodeId] = node;
  
//           // 🔥 Wildfire alert (null-safe)
//             const wildfire =
//             node.temperature != null &&
//             node.humidity != null &&
//             (
//               (node.pm25 != null && node.pm25 > WILDFIRE_THRESHOLDS.pm25) ||
//               (node.pm10 != null && node.pm10 > WILDFIRE_THRESHOLDS.pm10)
//             ) &&
//             node.temperature > WILDFIRE_THRESHOLDS.temperature &&
//             node.humidity < WILDFIRE_THRESHOLDS.humidity;

//             if (wildfire) {
//             throttledAlert("wildfire", () =>
//               toast.error(`🔥 Early signs of wildfire at ${nodeId}`)
//             );
//             }

//             // 💥 Earthquake alert (null-safe)
//             if (
//             node.accel != null &&
//             node.accel > EARTHQUAKE_THRESHOLDS.accel_strong
//             ) {
//             throttledAlert("earthquake", () =>
//               toast.warn(`💥 Earthquake shaking at ${nodeId}`)
//             );
//             }
//         });
  
//         // 2️⃣ Update sensors ONCE
//         setSensors(transformed);
  
//         // 3️⃣ Update history ONCE (functional update)
//         setHistory(prev => {
//           const next = { ...prev };
  
//           Object.entries(transformed).forEach(([nodeId, node]) => {
//             if (!next[nodeId]) next[nodeId] = {};
  
//             metrics.forEach(metric => {
//               const prevArr = next[nodeId][metric] || [];
//               next[nodeId][metric] = [
//                 ...prevArr.slice(-9),
//                 {
//                   value: node[metric],
//                   timestamp: new Date(node.timestamp * 1000).toLocaleTimeString()

//                 }
//               ];
//             });
//           });
  
//           return next;
//         });
  
//       } catch (err) {
//         console.error("Failed to fetch sensor data", err);
//       }
//     }, 2000);
  
//     return () => clearInterval(interval);
//   }, []);
  

//   return (
//     <div className="min-h-screen bg-gray-100 p-8">
//       <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={true} />
//       <div className="dashboard">
//       <h1>Sensor Dashboard</h1>

//       <div className="grid gap-6">
//         {Object.keys(sensors).length === 0 && <p className="no-data">No sensor data available</p>}

//         {Object.entries(sensors).map(([nodeId, data]) => (
//           <div key={nodeId} className="sensor-card">
//             <h2>{nodeId.toUpperCase()}</h2>

//             <div className="sensor-metrics">
//               <div className="text-center">
//                   <div className="metric-value pm25">{data.pm1}</div>
//                   <div className="metric-label">PM1 μg/m³</div>
//               </div>
//               <div className="text-center">
//                   <div className="metric-value pm25">{data.pm25}</div>
//                   <div className="metric-label">PM2.5 μg/m³</div>
//               </div>
//               <div className="text-center">
//                   <div className="metric-value pm10">{data.pm10}</div>
//                   <div className="metric-label">PM10 μg/m³</div>
//               </div>
//               <div className="text-center">
//                   <div className="metric-value temperature">{data.temperature}</div>
//                   <div className="metric-label">Temp °C</div>
//               </div>
//               <div className="text-center">
//                   <div className="metric-value humidity">{data.humidity}</div>
//                   <div className="metric-label">Humidity %</div>
//               </div>
//               <div className="text-center">
//                   <div className="metric-value pressure">{data.pressure}</div>
//                   <div className="metric-label">Pressure hPa</div>
//               </div>
//               <div className="text-center">
//                   <div className="metric-value accel">{data.accel}</div>
//                   <div className="metric-label">Acceleration m/s²</div>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>

//       <div className="metric-tabs">
//         {metrics.map(metric => (
//           <button
//             key={metric}
//             className={`metric-tab ${activeMetric === metric ? 'active' : ''}`}
//             onClick={() => setActiveMetric(metric)}
//           >
//             {metric.toUpperCase()}
//           </button>
//         ))}
//       </div>

//       <div className="grid gap-6">
//         {Object.entries(sensors).map(([nodeId]) => (
//           <div key={nodeId} className="graph-container">
//             <h2>{nodeId.toUpperCase()}</h2>
//             <ResponsiveContainer width="100%" height="103%">
//               <LineChart data={history[nodeId]?.[activeMetric] || []}>
//                 <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
//                 <XAxis dataKey="timestamp" />
//                 <YAxis />
//                 <Tooltip />
//                 <Legend />
//                 <Line type="monotone" dataKey="value" stroke="#8884d8" dot />
//               </LineChart>
//             </ResponsiveContainer>
//           </div>
//         ))}
//       </div>
//     </div>

//     </div>
//   );
// }

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import './Dashboard.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Dashboard() {
  const [sensors, setSensors] = useState({});
  const [history, setHistory] = useState({});
  const metrics = ['temperature', 'humidity', 'pressure', 'pm1', 'pm25', 'pm10', 'accel'];
  const [activeMetric, setActiveMetric] = useState(metrics[0]); 

  const accelMagnitude = (x, y, z) => {
    if (x == null || y == null || z == null) return null;
    return Math.sqrt(x*x + y*y + z*z);
  };
  
  const WILDFIRE_THRESHOLDS = {
    temperature: 27,  
    // humidity: 30,   
    pm25: 150,   
    pm10: 150   
  };

  const EARTHQUAKE_THRESHOLDS = {
    accel_light: 0.05,
    accel_moderate: 0.1,
    accel_strong: 0.5,
    accel_severe: 2.0,
    accel_violent: 10.0
  };

  // -------------------------
  // 🔥 ALERT RATE LIMITING
  // -------------------------
  const lastAlertRef = useRef({
    wildfire: 0,
    earthquake: 0
  });

  useEffect(() => {
    toast.info("Dashboard loaded");  // This should always show
  }, []);
  

  const throttledAlert = (type, fn, cooldown = 10000) => {
    const now = Date.now();
    if (now - lastAlertRef.current[type] >= cooldown) {
      lastAlertRef.current[type] = now;
      console.log("Triggering alert:", type)
      fn();
    }
  };
  // -------------------------

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://172.20.10.2:5000/api/sensors");
        const data = await res.json();
  
        const transformed = {};
  
        // 1️⃣ Build sensor snapshot + alerts
        Object.entries(data).forEach(([nodeId, nodeData]) => {
          const accel = accelMagnitude(
            nodeData.accel_x_ms2,
            nodeData.accel_y_ms2,
            nodeData.accel_z_ms2
          );

          const node = {
            temperature: nodeData.temperature_c,
            humidity: nodeData.humidity,
            pressure: nodeData.pressure_hpa,
            pm1: nodeData.pm1,
            pm25: nodeData.pm25,
            pm10: nodeData.pm10,
            accel,
            timestamp: nodeData.timestamp
          };
  
          transformed[nodeId] = node;
  
          // 🔥 Wildfire alert (null-safe)
          const wildfire =
            node.temperature != null &&
            (
              (node.pm25 != null && node.pm25 > WILDFIRE_THRESHOLDS.pm25) ||
              (node.pm10 != null && node.pm10 > WILDFIRE_THRESHOLDS.pm10)
            ) &&
            node.temperature > WILDFIRE_THRESHOLDS.temperature;

          if (wildfire) {
            console.log("Firing wildfire alert for", nodeId);
            throttledAlert("wildfire", () =>
              toast.error(`🔥 Early signs of wildfire at ${nodeId}`)
            );
          }

          // 💥 Earthquake alert (null-safe)
          if (node.accel != null && node.accel > EARTHQUAKE_THRESHOLDS.accel_strong) {
            throttledAlert("earthquake", () =>
              toast.warn(`💥 Earthquake shaking at ${nodeId}`)
            );
          }
        });
  
        // 2️⃣ Update sensors ONCE
        setSensors(transformed);
  
        // 3️⃣ Update history ONCE (functional update)
        setHistory(prev => {
          const next = { ...prev };
  
          Object.entries(transformed).forEach(([nodeId, node]) => {
            if (!next[nodeId]) next[nodeId] = {};
  
            metrics.forEach(metric => {
              const prevArr = next[nodeId][metric] || [];
              next[nodeId][metric] = [
                ...prevArr.slice(-9),
                {
                  value: node[metric],
                  timestamp: new Date(node.timestamp * 1000).toLocaleTimeString()
                }
              ];
            });
          });
  
          return next;
        });
  
      } catch (err) {
        console.error("Failed to fetch sensor data", err);
      }
    }, 2000);
  
    return () => clearInterval(interval);
  }, []);
  
  // -------------------------
  // JSX: Dashboard rendering
  // -------------------------
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={true} />
      <div className="dashboard">
        <h1>Sensor Dashboard</h1>

        <div className="grid gap-6">
          {Object.keys(sensors).length === 0 && <p className="no-data">No sensor data available</p>}

          {Object.entries(sensors).map(([nodeId, data]) => (
            <div key={nodeId} className="sensor-card">
              <h2>{nodeId.toUpperCase()}</h2>

              {/* -------------------------
                  Render metrics dynamically
                  Skip if value is null
              ------------------------- */}
              <div className="sensor-metrics">
                {metrics.map(metric => {
                  const value = data[metric];
                  if (value == null) return null; // Skip null or undefined values

                  // Map metric to readable label
                  let label = metric.toUpperCase();
                  switch(metric) {
                    case 'pm1': label = 'PM1 μg/m³'; break;
                    case 'pm25': label = 'PM2.5 μg/m³'; break;
                    case 'pm10': label = 'PM10 μg/m³'; break;
                    case 'temperature': label = 'Temp °C'; break;
                    case 'humidity': label = 'Humidity %'; break;
                    case 'pressure': label = 'Pressure hPa'; break;
                    case 'accel': label = 'Acceleration m/s²'; break;
                  }

                  return (
                    <div key={metric} className="text-center">
                      <div className={`metric-value ${metric}`}>{value}</div>
                      <div className="metric-label">{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Metric tabs */}
        <div className="metric-tabs">
          {metrics.map(metric => (
            <button
              key={metric}
              className={`metric-tab ${activeMetric === metric ? 'active' : ''}`}
              onClick={() => setActiveMetric(metric)}
            >
              {metric.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Graphs */}
        <div className="grid gap-6">
          {Object.entries(sensors).map(([nodeId]) => (
            <div key={nodeId} className="graph-container">
              <h2>{nodeId.toUpperCase()}</h2>
              <ResponsiveContainer width="100%" height="103%">
                <LineChart data={history[nodeId]?.[activeMetric] || []}>
                  <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#8884d8" dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
