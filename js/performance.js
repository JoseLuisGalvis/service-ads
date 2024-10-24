// Script para medir velocidad de carga

// Monitor de rendimiento con validación mejorada
class PerformanceMonitor {
  constructor() {
    this.initialized = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async initialize() {
    const timestamp = new Date().toISOString();
    console.log(`Iniciando monitoreo de rendimiento: ${timestamp}`);

    // Esperar a que el documento esté completamente cargado
    if (document.readyState !== "complete") {
      console.log("Documento aún no está completo, esperando...");
      await new Promise((resolve) => {
        document.addEventListener("readystatechange", () => {
          if (document.readyState === "complete") {
            resolve();
          }
        });
      });
    }

    // Dar tiempo adicional para que se establezcan todas las métricas
    await new Promise((resolve) => setTimeout(resolve, 500));

    this.measurePerformance();
  }

  isValidNumber(value) {
    return typeof value === "number" && isFinite(value) && value >= 0;
  }

  calculateMetric(start, end) {
    if (!this.isValidNumber(start) || !this.isValidNumber(end)) {
      return null;
    }
    const result = end - start;
    return result >= 0 ? result : null;
  }

  measurePerformance() {
    try {
      const navEntry = performance.getEntriesByType("navigation")[0];

      if (!navEntry) {
        throw new Error("API de Navigation Timing no disponible");
      }

      // Obtener métricas básicas asegurándonos que son válidas
      const metrics = {
        navigationStart: 0,
        pageLoad: this.isValidNumber(navEntry.loadEventEnd)
          ? navEntry.loadEventEnd
          : null,
        domReady: this.isValidNumber(navEntry.domContentLoadedEventEnd)
          ? navEntry.domContentLoadedEventEnd
          : null,
        serverResponse: this.calculateMetric(
          navEntry.requestStart,
          navEntry.responseEnd
        ),
        frontEnd: this.calculateMetric(
          navEntry.responseEnd,
          navEntry.loadEventEnd
        ),
        networkTime: this.calculateMetric(
          navEntry.fetchStart,
          navEntry.responseEnd
        ),
        processingTime: this.calculateMetric(
          navEntry.responseEnd,
          navEntry.loadEventEnd
        ),
        domProcessing: this.calculateMetric(
          navEntry.domLoading,
          navEntry.domComplete
        ),
      };

      // Verificar si tenemos suficientes métricas válidas
      const validMetrics = Object.entries(metrics).filter(
        ([_, value]) => value !== null && this.isValidNumber(value)
      );

      if (validMetrics.length < 4 && this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(
          `Reintentando medición (intento ${this.retryCount} de ${this.maxRetries})...`
        );
        setTimeout(() => this.measurePerformance(), this.retryDelay);
        return;
      }

      // Mostrar resultados solo de métricas válidas
      console.group("📊 Métricas de Rendimiento");
      validMetrics.forEach(([key, value]) => {
        const formattedTime =
          value > 1000
            ? `${(value / 1000).toFixed(2)}s`
            : `${Math.round(value)}ms`;
        console.log(`⏱️ ${key}: ${formattedTime}`);
      });
      console.groupEnd();

      // Análisis de rendimiento con métricas válidas
      this.analyzePerformance(Object.fromEntries(validMetrics));
    } catch (error) {
      console.error("Error al medir rendimiento:", error);

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(
          `Reintentando debido a error (intento ${this.retryCount} de ${this.maxRetries})...`
        );
        setTimeout(() => this.measurePerformance(), this.retryDelay);
      }
    }
  }

  analyzePerformance(metrics) {
    const analysisRules = {
      serverResponse: {
        threshold: 200,
        getMessage: (value) =>
          value < 200
            ? "✅ Excelente respuesta del servidor"
            : "⚠️ Considerar optimizar la respuesta del servidor",
      },
      frontEnd: {
        threshold: 1000,
        getMessage: (value) =>
          value < 1000
            ? "✅ Buen rendimiento frontend"
            : "⚠️ Considerar optimizar la carga frontend",
      },
      processingTime: {
        threshold: 500,
        getMessage: (value) =>
          value < 500
            ? "✅ Buen tiempo de procesamiento"
            : "⚠️ Optimizar el procesamiento del DOM",
      },
      networkTime: {
        threshold: 300,
        getMessage: (value) =>
          value < 300
            ? "✅ Buena velocidad de red"
            : "⚠️ Considerar optimizar recursos de red",
      },
    };

    console.group("🔍 Análisis de Rendimiento");
    Object.entries(metrics).forEach(([key, value]) => {
      if (analysisRules[key] && this.isValidNumber(value)) {
        console.log(analysisRules[key].getMessage(value));
      }
    });
    console.groupEnd();
  }
}

// Inicializar el monitor
const monitor = new PerformanceMonitor();

// Esperar a que la página esté lista antes de iniciar
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => monitor.initialize());
} else {
  monitor.initialize();
}
