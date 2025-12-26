import { Thermometer, Gauge, Zap, Info, Code, Anchor, Usb } from 'lucide-react';

interface StatusBarProps {
  extractionBoilerTemp: number;
  steamBoilerTemp: number;
  brewHeadTemp: number;
  extractionBoilerPressure: number;
  steamBoilerPressure: number;
  flowRate: number;
  ctrVersion: string;
  version: string;
}

export function StatusBar({
  extractionBoilerTemp,
  steamBoilerTemp,
  brewHeadTemp,
  extractionBoilerPressure,
  steamBoilerPressure,
  flowRate,
  ctrVersion,
  version
}: StatusBarProps) {
  return (
    <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4 shadow-lg">
      <div className="flex gap-4 items-center justify-start flex-wrap">

        {/* SC调试平台 标题 */}
        <div className="flex items-center gap-2 bg-slate-600/50 px-4 py-3 rounded-lg border border-slate-500/30 mr-4">
          <Anchor className="w-6 h-6 text-sky-400" />
          <div className="text-lg font-bold text-sky-100 tracking-wide">咖啡自由SC调试平台</div>
        </div>

        {/* 温度区域 - 红色系 */}
        <div className="flex items-center gap-2 bg-red-500/20 px-4 py-3 rounded-lg backdrop-blur-sm border border-red-400/30">
          <Thermometer className="w-5 h-5 text-red-400" />
          <div>
            <div className="text-xs opacity-80">萃取锅炉温度</div>
            <div className="font-mono text-sm text-red-300">{extractionBoilerTemp.toFixed(1)} °C</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-red-500/20 px-4 py-3 rounded-lg backdrop-blur-sm border border-red-400/30">
          <Thermometer className="w-5 h-5 text-red-400" />
          <div>
            <div className="text-xs opacity-80">蒸汽锅炉温度</div>
            <div className="font-mono text-sm text-red-300">{steamBoilerTemp.toFixed(1)} °C</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-red-500/20 px-4 py-3 rounded-lg backdrop-blur-sm border border-red-400/30">
          <Thermometer className="w-5 h-5 text-red-400" />
          <div>
            <div className="text-xs opacity-80">冲煮头温度</div>
            <div className="font-mono text-sm text-red-300">{brewHeadTemp.toFixed(1)} °C</div>
          </div>
        </div>

        {/* 压力区域 - 蓝色系 */}
        <div className="flex items-center gap-2 bg-blue-500/20 px-4 py-3 rounded-lg backdrop-blur-sm border border-blue-400/30">
          <Gauge className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs opacity-80">萃取锅炉压力</div>
            <div className="font-mono text-sm text-blue-300">{extractionBoilerPressure.toFixed(2)} bar</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-blue-500/20 px-4 py-3 rounded-lg backdrop-blur-sm border border-blue-400/30">
          <Gauge className="w-5 h-5 text-blue-400" />
          <div>
            <div className="text-xs opacity-80">蒸汽锅炉压力</div>
            <div className="font-mono text-sm text-blue-300">{steamBoilerPressure.toFixed(2)} bar</div>
          </div>
        </div>

        {/* 流速区域 - 绿色系 */}
        <div className="flex items-center gap-2 bg-green-500/20 px-4 py-3 rounded-lg backdrop-blur-sm border border-green-400/30">
          <Zap className="w-5 h-5 text-green-400" />
          <div>
            <div className="text-xs opacity-80">流速</div>
            <div className="font-mono text-sm text-green-300">{flowRate.toFixed(1)} ml/s</div>
          </div>
        </div>

        {/* CTR版本 - 紫色系 */}
        <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-3 rounded-lg backdrop-blur-sm border border-amber-400/30">
          <Info className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-xs opacity-80">CTR</div>
            <div className="font-mono text-sm text-amber-300">{ctrVersion}</div>
          </div>
        </div>

        {/* 版本信息 - 黄色系 */}
        <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-3 rounded-lg backdrop-blur-sm border border-amber-400/30">
          <Code className="w-5 h-5 text-amber-400" />
          <div>
            <div className="text-xs opacity-80">Web版本</div>
            <div className="font-mono text-sm text-amber-300">{version}</div>
          </div>
        </div>
      </div>
    </div>
  );
}