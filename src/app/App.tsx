import { useState, useCallback } from 'react';
import { StatusBar } from './components/StatusBar';
import { SerialPanel, MachineStatus } from './components/SerialPanel';
import { ChartTabs } from './components/ChartTabs';

export default function App() {
  const [extractionBoilerTemp, setExtractionBoilerTemp] = useState(0);
  const [steamBoilerTemp, setSteamBoilerTemp] = useState(0);
  const [brewHeadTemp, setBrewHeadTemp] = useState(0);
  const [extractionBoilerPressure, setExtractionBoilerPressure] = useState(0);
  const [steamBoilerPressure, setSteamBoilerPressure] = useState(0);
  const [flowRate, setFlowRate] = useState(0);
  const [ctrVersion, setCtrVersion] = useState('-');
  const version = 'v1.0.0';

  // Initialize empty data structures with current time
  const initData = () => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return Array.from({ length: 20 }, (_, i) => ({
      time: timeStr,
      value: 0
    }));
  };

  const [extractionBoilerTempData, setExtractionBoilerTempData] = useState(initData);
  const [steamBoilerTempData, setSteamBoilerTempData] = useState(initData);
  const [brewHeadTempData, setBrewHeadTempData] = useState(initData);
  const [extractionBoilerPressureData, setExtractionBoilerPressureData] = useState(initData);
  const [steamBoilerPressureData, setSteamBoilerPressureData] = useState(initData);
  const [flowRateData, setFlowRateData] = useState(initData);

  const handleDataReceived = (data: string) => {
    // console.log('Received data from serial:', data);
  };

  const handleStatusUpdate = useCallback((status: MachineStatus) => {
    setExtractionBoilerTemp(status.brew_boiler_temperature);
    setSteamBoilerTemp(status.steam_boiler_temperature);
    setBrewHeadTemp(status.brew_head_temperature);
    setExtractionBoilerPressure(status.brew_boiler_pressure);
    setSteamBoilerPressure(status.steam_boiler_pressure);
    setFlowRate(status.flow_rate);
    setCtrVersion(status.ucFwVersion);

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const updateChartData = (prev: { time: string, value: number }[], newValue: number) => {
      const newData = [...prev.slice(1), { time: timeStr, value: newValue }];
      return newData;
    };

    setExtractionBoilerTempData(prev => updateChartData(prev, status.brew_boiler_temperature));
    setSteamBoilerTempData(prev => updateChartData(prev, status.steam_boiler_temperature));
    setBrewHeadTempData(prev => updateChartData(prev, status.brew_head_temperature));
    setExtractionBoilerPressureData(prev => updateChartData(prev, status.brew_boiler_pressure));
    setSteamBoilerPressureData(prev => updateChartData(prev, status.steam_boiler_pressure));
    setFlowRateData(prev => updateChartData(prev, status.flow_rate));

  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 顶部状态栏 */}
      <StatusBar
        extractionBoilerTemp={extractionBoilerTemp}
        steamBoilerTemp={steamBoilerTemp}
        brewHeadTemp={brewHeadTemp}
        extractionBoilerPressure={extractionBoilerPressure}
        steamBoilerPressure={steamBoilerPressure}
        flowRate={flowRate}
        ctrVersion={ctrVersion}
        version={version}
      />

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧图表区域 */}
        <div className="flex-1 overflow-hidden">
          <ChartTabs
            extractionBoilerTempData={extractionBoilerTempData}
            steamBoilerTempData={steamBoilerTempData}
            brewHeadTempData={brewHeadTempData}
            extractionBoilerPressureData={extractionBoilerPressureData}
            steamBoilerPressureData={steamBoilerPressureData}
            flowRateData={flowRateData}
          />
        </div>

        {/* 右侧串口面板 */}
        <div className="w-[480px] overflow-hidden border-l border-gray-200 shadow-md z-10">
          <SerialPanel
            onDataReceived={handleDataReceived}
            onStatusUpdate={handleStatusUpdate}
          />
        </div>
      </div>
    </div>
  );
}