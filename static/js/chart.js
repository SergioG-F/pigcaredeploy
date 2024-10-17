let chart;
let percentageChart;

// Inicializar el gráfico de barras
function initializeChart() {
    const ctx = document.getElementById('detectionsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Comportamiento 1', 'Comportamiento 2', 'Comportamiento 3'], // Etiquetas de los modelos
            datasets: [{
                label: 'Detecciones por comportamiento',
                data: [0, 0, 0], // Inicialmente en 0
                backgroundColor: ['rgba(255, 99, 132, 0.2)', 'rgba(54, 162, 235, 0.2)', 'rgba(75, 192, 192, 0.2)'],
                borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Inicializar el gráfico de porcentaje
function initializePercentageChart() {
    const ctx = document.getElementById('percentageChart').getContext('2d');
    percentageChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Comportamiento 1', 'Comportamiento 2', 'Comportamiento 3'],
            datasets: [{
                data: [0, 0, 0], // Inicialmente en 0
                backgroundColor: ['#FF6384', '#36A2EB', '#4BC0C0']
            }]
        }
    });
}

// Función para actualizar el gráfico de barras
function updateChart(detections) {
    const counts = [0, 0, 0]; // Contadores para cada comportamiento

    // Verifica si existen detecciones para cada modelo
    if (detections.modelo1) {
        detections.modelo1.forEach(() => counts[0]++);
    }
    if (detections.modelo2) {
        detections.modelo2.forEach(() => counts[1]++);
    }
    if (detections.modelo3) {
        detections.modelo3.forEach(() => counts[2]++);
    }

    // Actualizar los datos del gráfico de barras
    chart.data.datasets[0].data = counts;
    chart.update(); // Refresca el gráfico de barras
}

// Función para actualizar el gráfico de porcentaje
function updatePercentageChart(detections) {
    const counts = [0, 0, 0]; // Contadores para cada comportamiento

    // Verifica si existen detecciones para cada modelo
    if (detections.modelo1) {
        detections.modelo1.forEach(() => counts[0]++);
    }
    if (detections.modelo2) {
        detections.modelo2.forEach(() => counts[1]++);
    }
    if (detections.modelo3) {
        detections.modelo3.forEach(() => counts[2]++);
    }

    // Sumar total de detecciones
    const total = counts.reduce((a, b) => a + b, 0);

    // Convertir a porcentaje
    const percentages = counts.map(count => ((count / total) * 100).toFixed(2));

    // Actualizar los datos del gráfico de porcentaje
    percentageChart.data.datasets[0].data = percentages;
    percentageChart.update(); // Refresca el gráfico de doughnut
}

// Llamar a las funciones de inicialización de gráficos cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    initializeChart(); // Inicializar el gráfico de barras
    initializePercentageChart(); // Inicializar el gráfico de porcentaje
});

// Función para actualizar ambos gráficos
function updateCharts(detections) {
    updateChart(detections); // Actualiza el gráfico de barras
    updatePercentageChart(detections); // Actualiza el gráfico circular
}
