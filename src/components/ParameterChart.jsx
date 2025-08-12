import { Line } from "react-chartjs-2";
import "./ParameterChart.css";

const ParameterChart = ({
    title,
    unit,
    labels,
    dataPoints,
    min,
    max,
    borderColor,
    backgroundColor,
}) => {
    const data = {
        labels,
        datasets: [
            {
                label: title,
                data: dataPoints.map(d => parseFloat(d.toFixed(2))),
                borderColor,
                backgroundColor,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                min,  // use prop value
                max,  // use prop value
                ticks: {
                    color: "#444",
                    font: { size: 12 },
                },
                grid: {
                    display: false,
                },
            },
            x: {
                type: "time",
                time: {
                    unit: "minute",
                    tooltipFormat: "hh:mm a",
                    displayFormats: {
                        minute: "hh:mm a",
                    },
                },
                ticks: {
                    maxRotation: 0,
                    minRotation: 0,
                    autoSkip: true,
                    color: "#444",
                    font: { size: 12 },
                },
                grid: {
                    display: false,
                },
            },
        },
        plugins: {
            legend: { display: false },
            datalabels: {
                anchor: 'end',
                align: 'top',
                formatter: (value) => value?.toFixed ? value.toFixed(2) : value,
                color: '#444',
                font: {
                    size: 10,
                },
            },
        },
    };

    const safeMin = dataPoints?.length ? Math.min(...dataPoints) : 0;
    const safeMax = dataPoints?.length ? Math.max(...dataPoints) : 0;

    return (
        <div className="param-chart-wrapper">
            <div className="chart-title">
                <span>{title}</span>
                <span className="minmax">
                     Min: {safeMin.toFixed(2)} {unit} | Max: {safeMax.toFixed(2)} {unit}
                </span>
            </div>
            <div className="chart-canvas">
                <Line data={data} options={options} />
            </div>
        </div>
    );
};

export default ParameterChart;
