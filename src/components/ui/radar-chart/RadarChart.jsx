import './RadarChart.css';
import {
  Radar,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

/**
 * RadarChart for 6+1 Experience Pillars
 * @param {Object} props
 * @param {Array} props.data - Array of pillar data { name, value, description }
 * @param {string} props.title - Chart title
 * @param {string} props.height - Height of chart (default: 300)
 */
export function RadarChart({ data = [], title, height = 300 }) {
  // Map pillar data to chart format
  const chartData = data.map((p) => ({
    name: p.pillarName || p.name,
    value: p.averageSaturatedScore ?? p.value ?? 0,
    fullMark: 100,
    description: p.description,
  }));

  // Add RealWorldWork (+1) if present in data
  const realWorldData = data.find(
    (p) => p.pillar === 'RealWorldWork' || p.pillarName === 'Thực chiến',
  );
  if (realWorldData && !chartData.find((c) => c.name === 'Thực chiến')) {
    chartData.push({
      name: 'Thực chiến (+1)',
      value: realWorldData.averageSaturatedScore ?? realWorldData.value ?? 0,
      fullMark: 100,
      description: realWorldData.description,
    });
  }

  if (chartData.length === 0) {
    return <div className="radar-chart-content">Chưa có dữ liệu radar</div>;
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="radar-chart-content-2">
          <p className="radar-chart-description">{data.name}</p>
          <p className="radar-chart-description-2">
            Điểm bão hòa: <span className="radar-chart-text">{data.value.toFixed(1)}</span>
          </p>
          {data.description && <p className="radar-chart-description-3">{data.description}</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="radar-chart-content-3">
      {title && <h3 className="radar-chart-subheading">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsRadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke="#e9ebee" />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#718094' }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#a2a6ae' }}
            tickCount={5}
            axisLine={false}
          />
          <Radar
            name="Điểm bão hòa"
            dataKey="value"
            stroke="#ed641c"
            fill="#ed641c"
            fillOpacity={0.18}
            strokeWidth={2}
          />
          <Tooltip content={<CustomTooltip />} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
