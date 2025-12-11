import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from 'recharts';
import './Dashboard.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



export default function Dashboard() {
  // const [sensors, setSensors] = useState({});
  const mockHistory = {
    "node-01": {
      temperature: Array.from({ length: 10 }, (_, i) => ({
        value: 20 + i * 0.5, // temperatures 20, 20.5, ..., 24.5
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      })),
      humidity: Array.from({ length: 10 }, (_, i) => ({
        value: 40 + i, // 40,41,...49
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      })),
      pressure: Array.from({ length: 10 }, (_, i) => ({
        value: 1010 + i * 0.2,
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      })),
      pm1: Array.from({ length: 10 }, (_, i) => ({
        value: 5 + i,
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      })),
      pm25: Array.from({ length: 10 }, (_, i) => ({
        value: 10 + i * 2,
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      })),
      pm10: Array.from({ length: 10 }, (_, i) => ({
        value: 15 + i * 3,
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      }))
    },
    "node-02": {
      temperature: Array.from({ length: 10 }, (_, i) => ({
        value: 22 + i * 0.4,
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      })),
      humidity: Array.from({ length: 10 }, (_, i) => ({
        value: 35 + i,
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      })),
      pressure: Array.from({ length: 10 }, (_, i) => ({
        value: 1008 + i * 0.3,
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      })),
      pm1: Array.from({ length: 10 }, (_, i) => ({
        value: 3 + i,
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      })),
      pm25: Array.from({ length: 10 }, (_, i) => ({
        value: 8 + i * 2,
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      })),
      pm10: Array.from({ length: 10 }, (_, i) => ({
        value: 12 + i * 2.5,
        timestamp: `10:${i < 10 ? '0' : ''}${i} AM`
      }))
    }
  };
  const [history, setHistory] = useState(mockHistory);
  const [activeMetric, setActiveMetric] = useState('temperature'); 
  const [sensors, setSensors] = useState({
    "node-01": { temperature: 35, humidity: 25, pressure: 100, pm1: 5, pm25: 160, pm10: 180 },
    "node-02": { temperature: 33, humidity: 28, pressure: 200, pm1: 6, pm25: 140, pm10: 155 },
  });
  
  const metrics = ['temperature', 'humidity', 'pressure', 'pm1', 'pm25', 'pm10'];
  const WILDFIRE_THRESHOLDS = {
    temperature: 32,  
    humidity: 30,   
    pm25: 150,   
    pm10: 150   
  };
  

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://10.57.59.79:5000/api/sensors");
        const data = await res.json();

        const transformed = {};
        const newHistory = { ...history };

        Object.entries(data).forEach(([nodeId, nodeData]) => {
          transformed[nodeId] = {
            temperature: nodeData.temperature_c,
            humidity: nodeData.humidity,
            pressure: nodeData.pressure_hpa,
            pm1: nodeData.pm1,
            pm25: nodeData.pm25,
            pm10: nodeData.pm10
          };

          // Track history for graphs
          setHistory(prevHistory => {
            const newHistory = { ...prevHistory };
            if (!newHistory[nodeId]) newHistory[nodeId] = {};
            metrics.forEach(metric => {
              if (!newHistory[nodeId][metric]) newHistory[nodeId][metric] = [];
              newHistory[nodeId][metric].push({
                value: transformed[nodeId][metric],
                timestamp: new Date().toLocaleTimeString()
              });
              if (newHistory[nodeId][metric].length > 10) newHistory[nodeId][metric].shift();
            });
            return newHistory;
          });

          // Check for wildfire alerts
          // Object.entries(WILDFIRE_THRESHOLDS).forEach(([metric, threshold]) => {
          //   if (metric === 'humidity' && transformed[nodeId][metric] < threshold) {
          //     toast.warn(`Low humidity alert for ${nodeId}: ${transformed[nodeId][metric]}%`);
          //   } else if (metric !== 'humidity' && transformed[nodeId][metric] > threshold) {
          //     toast.error(`High ${metric.toUpperCase()} alert for ${nodeId}: ${transformed[nodeId][metric]}`);
          //   }
          // });

          const isHighTemp = transformed[nodeId].temperature > WILDFIRE_THRESHOLDS.temperature;
        const isLowHumidity = transformed[nodeId].humidity < WILDFIRE_THRESHOLDS.humidity;
        const isHighPM = transformed[nodeId].pm25 > WILDFIRE_THRESHOLDS.pm25 || transformed[nodeId].pm10 > WILDFIRE_THRESHOLDS.pm10;

        if (isHighTemp && isLowHumidity && isHighPM) {
          toast.error(`🔥 Early signs of wildfire detected at ${nodeId}!
          - Temp: ${transformed[nodeId].temperature}°C
          - Humidity: ${transformed[nodeId].humidity}%
          - PM2.5: ${transformed[nodeId].pm25} μg/m³
          - PM10: ${transformed[nodeId].pm10} μg/m³`);
        }
      });

        setSensors(transformed);
        setHistory(newHistory);

      } catch (err) {
        console.error("Failed to fetch sensor data", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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
            <div className="sensor-metrics">
            <div className="text-center">
                <div className="metric-value pm25">{data.pm25}</div>
                <div className="metric-label">PM1 μg/m³</div>
              </div>
              <div className="text-center">
                <div className="metric-value pm25">{data.pm25}</div>
                <div className="metric-label">PM2.5 μg/m³</div>
              </div>
              <div className="text-center">
                <div className="metric-value pm10">{data.pm10}</div>
                <div className="metric-label">PM10 μg/m³</div>
              </div>
              <div className="text-center">
                <div className="metric-value temperature">{data.temperature}</div>
                <div className="metric-label">Temp °C</div>
              </div>
              <div className="text-center">
                <div className="metric-value humidity">{data.humidity}</div>
                <div className="metric-label">Humidity %</div>
              </div>
              <div className="text-center">
                <div className="metric-value pressure">{data.pressure}</div>
                <div className="metric-label">Pressure hPa</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
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

      <div className="grid gap-6">
        {Object.entries(sensors).map(([nodeId, data]) => (
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
