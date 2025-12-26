import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings, Send, Trash2, Search, RefreshCw, Activity, Thermometer, Droplets, Gauge, PlayCircle, AlertCircle, StopCircle, Play } from 'lucide-react';

// Web Serial API Type Definitions
interface SerialPort {
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo(): SerialPortInfo;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

interface SerialPortInfo {
  usbVendorId?: number;
  usbProductId?: number;
}

interface NavigatorSerial {
  serial: {
    requestPort(options?: { filters?: Array<{ usbVendorId?: number; usbProductId?: number }> }): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
    addEventListener(type: string, listener: (event: Event) => void): void;
    removeEventListener(type: string, listener: (event: Event) => void): void;
  };
}

// Machine Status Interface
export interface MachineStatus {
  error_code: number;
  flow_rate: number;
  brew_boiler_pressure: number;
  brew_boiler_temperature: number;
  brew_head_temperature: number;
  brew_pressure_level: number;
  brew_boiler_water_level: number;
  steam_run_status: number;
  steam_boiler_pressure: number;
  steam_boiler_temperature: number;
  steam_milk_temperature: number;
  steam_pressure_level: number;
  hot_water_run_status: number;
  hot_water_percent_level: number;
  hot_water_temperature: number;
  tray_postion_state: number;
  brew_handle_postion_state: number;
  hot_switch_postion_state: number;
  tray_high_level_state: number;
  tray_low_level_state_1: number;
  tray_low_level_state_2: number;
  current_stage: number;
  total_stage: number;
  drink_making_flg: number;
  liquid_adc: number;
  liquid_weight: number;
  ucFwVersion: string;
}

interface SerialPanelProps {
  onDataReceived?: (data: string) => void;
  onStatusUpdate?: (status: MachineStatus) => void;
  onPortSelected?: (name: string) => void;
}

export function SerialPanel({ onDataReceived, onStatusUpdate, onPortSelected }: SerialPanelProps) {
  const [ports, setPorts] = useState<SerialPort[]>([]);
  const [selectedPort, setSelectedPort] = useState<SerialPort | null>(null);
  const [portInfo, setPortInfo] = useState<string>('');

  const [sendData, setSendData] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isReading, setIsReading] = useState(false);

  // Protocol State
  const [autoPoll, setAutoPoll] = useState(true);
  const [machineStatus, setMachineStatus] = useState<MachineStatus | null>(null);
  const [pollIntervalId, setPollIntervalId] = useState<ReturnType<typeof setInterval> | null>(null);

  // Refs for stream handling
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const keepReadingRef = useRef<boolean>(false);
  const bufferRef = useRef<string>('');
  const logBufferRef = useRef<string>('');
  const closedPromiseRef = useRef<Promise<void> | null>(null); // Track read loop completion

  // Initialize available ports
  useEffect(() => {
    const nav = navigator as unknown as NavigatorSerial;
    if (!nav.serial) {
      console.error('[System] Web Serial API not supported in this browser.');
      return;
    }

    const updatePorts = async () => {
      try {
        const availablePorts = await nav.serial.getPorts();
        setPorts(availablePorts);
        if (availablePorts.length > 0 && !selectedPort) {
          setSelectedPort(availablePorts[0]);
        }
      } catch (err) {
        console.error('Error listing ports:', err);
      }
    };

    updatePorts();

    const handleConnectEvent = () => updatePorts();
    const handleDisconnectEvent = () => updatePorts();

    nav.serial.addEventListener('connect', handleConnectEvent);
    nav.serial.addEventListener('disconnect', handleDisconnectEvent);

    return () => {
      nav.serial.removeEventListener('connect', handleConnectEvent);
      nav.serial.removeEventListener('disconnect', handleDisconnectEvent);
    };
  }, [selectedPort]);

  // Update info text when port changes
  useEffect(() => {
    if (selectedPort) {
      const info = selectedPort.getInfo();
      const vid = info.usbVendorId ? `VID:${info.usbVendorId.toString(16).padStart(4, '0')}` : '';
      const pid = info.usbProductId ? `PID:${info.usbProductId.toString(16).padStart(4, '0')}` : '';
      const infoStr = `${vid} ${pid}`.trim() || 'Generic Serial Device';

      setPortInfo(infoStr);
    } else {
      setPortInfo('');
    }
  }, [selectedPort]);

  // Sync connection status to parent
  useEffect(() => {
    if (isConnected && selectedPort && onPortSelected) {
      const idx = ports.indexOf(selectedPort);
      const portName = `Port ${idx !== -1 ? idx + 1 : '?'}`;
      const info = selectedPort.getInfo();
      const fullStr = `${portName} (${info.usbVendorId ? 'VID:' + info.usbVendorId.toString(16) : 'Generic'})`;
      onPortSelected(fullStr);
    } else if (onPortSelected) {
      onPortSelected('');
    }
  }, [isConnected, selectedPort, ports, onPortSelected]);

  // Polling Effect
  useEffect(() => {
    if (isConnected && autoPoll) {
      const id = setInterval(() => {
        sendString("102@READ@ALL#43433");
      }, 200);
      setPollIntervalId(id);
      return () => clearInterval(id);
    } else {
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        setPollIntervalId(null);
      }
    }
  }, [isConnected, autoPoll]);

  const sendString = async (str: string) => {
    if (!writerRef.current) return;
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      await writerRef.current.write(data);
    } catch (e) {
      console.error('Send failed', e);
    }
  };

  const handleSearchPort = async () => {
    const nav = navigator as unknown as NavigatorSerial;
    if (!nav.serial) return;

    try {
      const port = await nav.serial.requestPort();
      const currentPorts = await nav.serial.getPorts();
      setPorts(currentPorts);
      setSelectedPort(port);
    } catch (err) {
      console.log('Port selection cancelled or failed', err);
    }
  };

  const parseMachineStatus = (payload: string) => {
    // Format: 102@READ@<csv>#CRC
    const startMarker = "102@READ@";
    const startIndex = payload.lastIndexOf(startMarker);
    if (startIndex === -1) return;

    const remaining = payload.substring(startIndex + startMarker.length);
    const endIndex = remaining.indexOf('#');
    if (endIndex === -1) return;

    const csvData = remaining.substring(0, endIndex);
    const parts = csvData.split(',').map(s => s.trim());

    if (parts.length < 27) return;

    const status: MachineStatus = {
      error_code: parseInt(parts[0]) || 0,
      flow_rate: parseFloat(parts[1]) || 0,
      brew_boiler_pressure: parseFloat(parts[2]) || 0,
      brew_boiler_temperature: parseFloat(parts[3]) || 0,
      brew_head_temperature: parseFloat(parts[4]) || 0,
      brew_pressure_level: parseInt(parts[5]) || 0,
      brew_boiler_water_level: parseInt(parts[6]) || 0,
      steam_run_status: parseInt(parts[7]) || 0,
      steam_boiler_pressure: parseFloat(parts[8]) || 0,
      steam_boiler_temperature: parseFloat(parts[9]) || 0,
      steam_milk_temperature: parseFloat(parts[10]) || 0,
      steam_pressure_level: parseInt(parts[11]) || 0,
      hot_water_run_status: parseInt(parts[12]) || 0,
      hot_water_percent_level: parseInt(parts[13]) || 0,
      hot_water_temperature: parseFloat(parts[14]) || 0,
      tray_postion_state: parseInt(parts[15]) || 0,
      brew_handle_postion_state: parseInt(parts[16]) || 0,
      hot_switch_postion_state: parseInt(parts[17]) || 0,
      tray_high_level_state: parseInt(parts[18]) || 0,
      tray_low_level_state_1: parseInt(parts[19]) || 0,
      tray_low_level_state_2: parseInt(parts[20]) || 0,
      current_stage: parseInt(parts[21]) || 0,
      total_stage: parseInt(parts[22]) || 0,
      drink_making_flg: parseInt(parts[23]) || 0,
      liquid_adc: parseInt(parts[24]) || 0,
      liquid_weight: parseFloat(parts[25]) || 0,
      ucFwVersion: parts[26] || '',
    };

    setMachineStatus(status);
    if (onStatusUpdate) {
      onStatusUpdate(status);
    }

    return startIndex + startMarker.length + endIndex + 1;
  };

  const readLoop = async () => {
    if (!portRef.current?.readable) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textDecoder = new (window as any).TextDecoderStream();
    const readableStreamClosed = portRef.current.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;

    try {
      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          // Log Buffering Logic
          // DEBUG: Print raw data to confirm reception
          console.log(`[Raw] Received chunk (${value.length} chars):`, JSON.stringify(value));

          logBufferRef.current += value;

          // Split on any common line ending: \r\n, \n, or \r
          // Note: If we receive "abc\r" and the next chunk is "\n", this might split early, 
          // but for visual logging this is acceptable to avoid delay.
          let lines = logBufferRef.current.split(/\r\n|\n|\r/);

          // If we have more than 1 item, it means we have at least one complete line
          if (lines.length > 1) {
            const completeLines = lines.slice(0, -1);
            const remainder = lines[lines.length - 1];

            logBufferRef.current = remainder;

            const time = new Date().toLocaleTimeString();
            completeLines.forEach(line => {
              if (line) {
                console.log(`[${time}] ${line}`);
              }
            });
          } else if (logBufferRef.current.length > 2000) {
            // Fail-safe: if line is too long without breaks, print it anyway
            console.log(`[${new Date().toLocaleTimeString()}] (Buffer Full) ${logBufferRef.current}`);
            logBufferRef.current = '';
          }

          // Parsing Logic (independent of log buffering)
          bufferRef.current += value;

          while (true) {
            const packetEnd = parseMachineStatus(bufferRef.current);
            if (packetEnd) {
              bufferRef.current = bufferRef.current.slice(packetEnd);
              continue;
            }
            break;
          }

          if (bufferRef.current.length > 10000) {
            bufferRef.current = bufferRef.current.slice(-1000);
          }

          if (onDataReceived) {
            onDataReceived(value);
          }
        }
      }
    } catch (error) {
      console.error('Read error:', error);
      setReceiveData(prev => prev + `\n[Error] Read error: ${error}\n`);
    } finally {
      reader.releaseLock();
      await readableStreamClosed.catch(() => { });
    }
  };

  const handleConnect = async () => {
    if (isConnected) {
      // Graceful Disconnect
      keepReadingRef.current = false;

      // 1. Cancel the reader to break the loop
      if (readerRef.current) {
        try {
          await readerRef.current.cancel();
        } catch (e) {
          console.error('Error cancelling reader', e);
        }
      }

      // 2. Wait for the read loop to completely finish (which releases locks)
      if (closedPromiseRef.current) {
        try {
          await closedPromiseRef.current;
        } catch (e) {
          console.error('Error in closedPromise', e);
        }
        closedPromiseRef.current = null;
      }

      // 3. Release writer lock
      if (writerRef.current) {
        try {
          writerRef.current.releaseLock();
        } catch (e) { console.error('Error releasing writer', e); }
      }

      // 4. Close the port
      if (portRef.current) {
        try {
          await portRef.current.close();
        } catch (e) {
          console.error('Error closing port', e);
        }
      }

      portRef.current = null;
      setIsConnected(false);
      setIsReading(false);
      setAutoPoll(false);
      console.log(`[${new Date().toLocaleTimeString()}] Disconnected`);

    } else {
      if (!selectedPort) return;

      try {
        await selectedPort.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none' });
        portRef.current = selectedPort;
        setIsConnected(true);
        console.log(`[${new Date().toLocaleTimeString()}] Connected (115200, 8N1)`);

        if (selectedPort.writable) {
          writerRef.current = selectedPort.writable.getWriter();
        }

        keepReadingRef.current = true;
        setIsReading(true);
        // Store the read loop promise to await on disconnect
        closedPromiseRef.current = readLoop();

      } catch (err) {
        console.error('Failed to connect:', err);
        setIsConnected(false);
      }
    }
  };

  const handleSend = async () => {
    if (!sendData.trim() || !isConnected || !writerRef.current) return;
    try {
      console.log(`[${new Date().toLocaleTimeString()}] Send: ${sendData}`);
      const encoder = new TextEncoder();
      const data = encoder.encode(sendData + '\n');
      await writerRef.current.write(data);
      setSendData('');
    } catch (err) {
      console.error('Send error:', err);
    }
  };

  const handleExtraction = async (start: boolean) => {
    const cmd = start ? "102@EXTRACT@START#" : "102@EXTRACT@STOP#";
    console.log(`[CMD] ${start ? 'Start' : 'Stop'} Extraction`);
    await sendString(cmd);
  };


  return (
    <div className="flex flex-col h-full bg-gray-50 border-l border-gray-200 overflow-y-auto">
      {/* 串口设置区 */}
      <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">串口设置</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">端口</label>
            <div className="flex gap-2">
              <select
                value={ports.indexOf(selectedPort as SerialPort)}
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  if (idx >= 0 && idx < ports.length) {
                    setSelectedPort(ports[idx]);
                  }
                }}
                disabled={isConnected}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {ports.length === 0 ? (
                  <option value="-1">No ports authorized</option>
                ) : (
                  ports.map((port, index) => {
                    const info = port.getInfo();
                    return (
                      <option key={index} value={index}>
                        Port {index + 1} {info.usbVendorId ? `(VID:${info.usbVendorId.toString(16)})` : ''}
                      </option>
                    );
                  })
                )}
              </select>
              <button
                onClick={handleSearchPort}
                disabled={isConnected}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50"
                title="Search & Request Port"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            {portInfo && <div className="text-xs text-gray-500 mt-1 pl-1">Device: {portInfo}</div>}
          </div>

          <div className="flex items-center gap-2 bg-blue-50 p-2 rounded border border-blue-100">
            <input
              type="checkbox"
              id="autoPoll"
              checked={autoPoll}
              onChange={(e) => setAutoPoll(e.target.checked)}
              disabled={!isConnected}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoPoll" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
              Auto Poll (200ms)
            </label>
            {autoPoll && isConnected && <span className="flex h-2 w-2 relative ml-auto">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>}
          </div>

          <button
            onClick={handleConnect}
            disabled={!selectedPort}
            className={`w-full py-2 rounded-md font-medium transition-colors ${isConnected
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-300'
              }`}
          >
            {isConnected ? '断开连接' : '连接'}
          </button>
        </div>
      </div>

      {/* 萃取控制区 - 仅连接时显示 */}
      {isConnected && (
        <div className="p-4 bg-purple-50 border-b border-purple-100 flex-shrink-0">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-purple-800">
            <PlayCircle className="w-4 h-4" />
            控制
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleExtraction(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors shadow-sm font-medium"
            >
              <Play className="w-4 h-4 fill-current" />
              萃取
            </button>
            <button
              onClick={() => handleExtraction(false)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors shadow-sm font-medium"
            >
              <StopCircle className="w-4 h-4" />
              停止
            </button>
          </div>
        </div>
      )}

      {/* Machine Status Dashboard - 可滚动 */}
      {machineStatus && (
        <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              Machine Status
            </h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">
              CTR Ver: {machineStatus.ucFwVersion}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">

            {/* Brew Section */}
            <div className="col-span-2 bg-orange-50 p-2 rounded border border-orange-100">
              <div className="font-semibold text-orange-800 mb-2 flex items-center gap-1">
                <Droplets className="w-3 h-3" /> Brew (Flow: {machineStatus.flow_rate.toFixed(1)} ml/s)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Boiler Temp</span>
                  <span className="font-medium">{machineStatus.brew_boiler_temperature.toFixed(1)}°C</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Boiler Pressure</span>
                  <span className="font-medium">{machineStatus.brew_boiler_pressure.toFixed(1)} bar</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Head Temp</span>
                  <span className="font-medium">{machineStatus.brew_head_temperature.toFixed(1)}°C</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Weight</span>
                  <span className="font-medium">{machineStatus.liquid_weight.toFixed(1)} g</span>
                </div>
              </div>
            </div>

            {/* Steam Section */}
            <div className="col-span-2 bg-blue-50 p-2 rounded border border-blue-100">
              <div className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                <Gauge className="w-3 h-3" /> Steam ({machineStatus.steam_run_status ? 'Running' : 'Stopped'})
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Boiler Temp</span>
                  <span className="font-medium">{machineStatus.steam_boiler_temperature.toFixed(1)}°C</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Pressure</span>
                  <span className="font-medium">{machineStatus.steam_boiler_pressure.toFixed(1)} bar</span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-xs text-gray-500">Milk Temp</span>
                  <span className="font-medium">{machineStatus.steam_milk_temperature.toFixed(1)}°C</span>
                </div>
              </div>
            </div>

            {/* Status Flags */}
            <div className="col-span-2 grid grid-cols-2 gap-2 text-xs">
              <div className={`p-1 rounded text-center border ${machineStatus.tray_postion_state ? 'bg-green-100 border-green-200 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                Tray: {machineStatus.tray_postion_state ? 'In Place' : 'Missing'}
              </div>
              <div className={`p-1 rounded text-center border ${machineStatus.brew_handle_postion_state ? 'bg-green-100 border-green-200 text-green-700' : 'bg-red-50 border-red-100 text-red-600'}`}>
                Handle: {machineStatus.brew_handle_postion_state ? 'In Place' : 'Missing'}
              </div>
              <div className={`p-1 rounded text-center border ${machineStatus.tray_high_level_state ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                Water High: {machineStatus.tray_high_level_state ? 'Yes' : 'No'}
              </div>
              <div className={`p-1 rounded text-center border ${machineStatus.error_code !== 0 ? 'bg-red-100 border-red-200 text-red-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                Err: {machineStatus.error_code}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 数据发送区 */}
      <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <h3 className="font-semibold mb-3">数据发送</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={sendData}
            onChange={(e) => setSendData(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入要发送的数据..."
            disabled={!isConnected}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            onClick={handleSend}
            disabled={!isConnected}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            发送
          </button>
        </div>
      </div>
    </div>
  );
}