import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function CreditScoreCard() {
  const [score, setScore] = useState(720);
  const [maxScore] = useState(850);
  const [minScore] = useState(300);

  useEffect(() => {
    const mockScore = Math.floor(Math.random() * (820 - 620 + 1) + 620);
    setScore(mockScore);
  }, []);

  const getScoreColor = () => {
    if (score >= 750) return '#2e7d32';
    if (score >= 670) return '#ed6c02';
    return '#d32f2f';
  };

  const getRating = () => {
    if (score >= 800) return 'Excellent';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };

  const chartData = {
    datasets: [{
      data: [score - minScore, maxScore - score],
      backgroundColor: [getScoreColor(), '#e0e0e0'],
      borderWidth: 0,
      cutout: '70%',
      borderRadius: 10,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { tooltip: { enabled: false }, legend: { display: false } },
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="font-semibold text-gray-800 mb-2">Credit Score Simulator</h3>
      <p className="text-xs text-gray-500 mb-4">FICO® Score</p>
      <div className="relative w-40 h-40 mx-auto">
        <Doughnut data={chartData} options={chartOptions} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold">{score}</span>
          <span className="text-xs text-gray-500">/ {maxScore}</span>
        </div>
      </div>
      <div className="text-center mt-4">
        <p className="text-sm font-medium" style={{ color: getScoreColor() }}>{getRating()}</p>
        <p className="text-xs text-gray-400 mt-1">Based on simulated data</p>
      </div>
    </div>
  );
}