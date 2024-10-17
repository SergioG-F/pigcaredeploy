async function getCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter((device) => device.kind === "videoinput");
  if (videoDevices.length > 0) {
    startStream(
      videoDevices[0].deviceId,
      document.getElementById("videoElement")
    );
  }

  if (videoDevices.length > 1) {
    startStream(
      videoDevices[1].deviceId,
      document.getElementById("videoElementTwo"),
      "Two"
    );
  }
}

getCameras();

async function startStream(deviceId, videoElement, cameraNumber = "") {
  if (navigator.mediaDevices.getUserMedia) {
    const constraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
      },
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoElement.srcObject = stream;
      captureAndSendAlt(cameraNumber);
      //captureAndSendForMultipleModels(cameraNumber);
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  }
}

function captureAndSendAlt(cameraNumber = "") {
  var video = document.getElementById("videoElement" + cameraNumber);
  var canvas = document.getElementById(`overlayCanvas${cameraNumber}`);
  var ctx = canvas.getContext("2d");

  // Captura la primera imagen
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageDataURL1 = canvas.toDataURL("image/jpeg");

  // Espera un pequeño lapso de tiempo y captura la segunda imagen
  setTimeout(() => {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataURL2 = canvas.toDataURL("image/jpeg");

    // Enviar ambas imágenes al servidor para la detección de movimiento
    fetch("/process_images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image1: imageDataURL1,
        image2: imageDataURL2,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Detecciones de movimiento recibidas:", data);
        drawAnnotations(data.detections, cameraNumber); // Dibujar anotaciones de movimiento
      })
      .catch((error) =>
        console.error("Error en la detección de movimiento:", error)
      );

    // También enviar la primera imagen para procesarla con los modelos
    fetch("/process_images_modelo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imageDataURL1, // Usa la primera imagen para los modelos
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Detecciones YOLO recibidas:", data);                               // Verificar detecciones de los modelos
        drawAnnotationsModelPigDrinking(data.modelo1, "Modelo Bebiendo", cameraNumber);             //Cerdo Bebiendo
        drawAnnotationsModelPigFace(data.modelo2, "Modelo Cara", cameraNumber);                     //Cerdo Cara
        drawAnnotationsModelPigBehavior(data.modelo2, "Modelo Comportamiento", cameraNumber);       //Cerdo Comportamiento
        drawAnnotationsModelPigDisease(data.modelo2, "Modelo Enfermedad", cameraNumber);            //Cerdo Enfermedad
        drawAnnotationsModelPigEar(data.modelo2, "Modelo Oreja", cameraNumber);                     //Cerdo Oreja
        drawAnnotationsModelPigPosition(data.modelo2, "Modelo Postura", cameraNumber);              //Cerdo Postura

        updateCharts(data); // Actualiza gráficos con los datos recibidos
      })
      .catch((error) =>
        console.error("Error en la detección de modelos:", error)
      );
  }, 500); // 500ms de espera antes de capturar la segunda imagen
}

function updateAnnotation(annotation, containerId, textId, cameraNumber = "") {
  var videoElement = document.getElementById("videoElement" + cameraNumber);
  const container = document.querySelector(".video-container");
  const { class: className, x1, x2, y1, y2 } = annotation;

  const rectLeft = (x1 / videoElement.videoWidth) * container.offsetWidth;
  const rectTop = (y1 / videoElement.videoHeight) * container.offsetHeight;
  const rectWidth =
    ((x2 - x1) / videoElement.videoWidth) * container.offsetWidth;
  const rectHeight =
    ((y2 - y1) / videoElement.videoHeight) * container.offsetHeight;

  const annotationRect = document.getElementById(containerId);
  annotationRect.style.left = `${rectLeft}px`;
  annotationRect.style.top = `${rectTop}px`;
  annotationRect.style.width = `${rectWidth}px`;
  annotationRect.style.height = `${rectHeight}px`;
  annotationRect.style.display = "block";

  const annotationText = document.getElementById(textId);
  annotationText.textContent = "Movimiento";
  annotationText.style.left = `${rectLeft}px`;
  annotationText.style.top = `${rectTop - 20}px`; // Ajusta la posición del texto según necesites
  annotationText.style.display = "block";
}

function drawAnnotations(detections, cameraNumber = "") {
  const videoContainer = document.getElementById(
    "videoContainer" + cameraNumber
  );
  const rectangles = videoContainer.querySelectorAll(".annotation-rectangle");
  const texts = videoContainer.querySelectorAll(".annotation-text");

  rectangles.forEach((rectangle) => (rectangle.style.display = "none"));
  texts.forEach((text) => (text.style.display = "none"));

  for (let i = 0; i < detections.length; i += 1) {
    const annotation = detections[i];

    const videoElement = document.getElementById("videoElement" + cameraNumber);

    // Crear el div para el rectángulo de anotación
    const annotationRectangle = document.createElement("div");
    const annotationId = `annotationContainer${i}`;
    annotationRectangle.id = annotationId;
    annotationRectangle.className = "annotation-rectangle";

    // Crear el div para el texto de anotación
    const annotationText = document.createElement("div");
    const annotationTextId = `annotationText${i}`;
    annotationText.id = annotationTextId;
    annotationText.className = "annotation-text";

    // Agregar los elementos al contenedor
    videoContainer.appendChild(annotationRectangle);
    videoContainer.appendChild(annotationText);

    updateAnnotation(annotation, annotationId, annotationTextId, cameraNumber);
  }

  requestAnimationFrame(() => captureAndSendAlt(cameraNumber));
}

document.addEventListener("DOMContentLoaded", () => {
  const chart = echarts.init(document.querySelector("#lineChart"));
  chart.setOption({
    xAxis: {
      type: "category",
      data: [], // Se actualizará dinámicamente
    },
    yAxis: {
      type: "value",
    },
    series: [
      {
        data: [],
        type: "line",
        smooth: true,
      },
    ],
  });

  function getReport() {
    fetch("/report-movements")
      .then((response) => response.json())
      .then(({ items }) => {
        updateChartData(items);
      })
      .catch((error) => console.error("Error:", error));
  }

  setInterval(getReport, 2000);
});

//////new funciones

function updateChartData(apiData, startHour = 14, endHour = 19) {
  const minutes = [];
  const movementCounts = [];

  for (let index = 0; index < apiData.length; index++) {
    const { minute, movement_count } = apiData[index];
    minutes.push(minute);
    movementCounts.push(movement_count);
  }

  // Actualizar el gráfico con los nuevos datos
  chart.setOption({
    xAxis: {
      data: minutes,
    },
    series: [
      {
        data: movementCounts,
      },
    ],
  });
}


function updateChart(detections) {
  const counts = [0, 0, 0]; // Contadores para cada comportamiento

  if (detections.modelo1) {
    detections.modelo1.forEach(() => counts[0]++);
  }
  if (detections.modelo2) {
    detections.modelo2.forEach(() => counts[1]++);
  }
  if (detections.modelo3) {
    detections.modelo3.forEach(() => counts[2]++);
  }

  chart.data.datasets[0].data = counts; // Actualizar los datos del gráfico
  chart.update(); // Refrescar el gráfico para mostrar los nuevos valores
}

// Función para dibujar anotaciones de los modelos YOLO
function drawAnnotationsModelPigDrinking(detections, modelName, cameraNumber) {
  const videoContainer = document.getElementById("videoContainer" + cameraNumber);

  const rectangles = videoContainer.querySelectorAll(".annotation-rectangle");
  rectangles.forEach((rectangle) => (rectangle.style.display = "none"));
  texts.forEach((text) => (text.style.display = "none"));

  //rectangles.forEach((rect) => rect.remove()); 
  detections.forEach((detection, index) => {
    const annotationRect = document.createElement("div");
    annotationRect.className = "annotation-rectangle";
    annotationRect.style.position = "absolute";
    annotationRect.style.left = `${detection.x1}px`;
    annotationRect.style.top = `${detection.y1}px`;
    annotationRect.style.width = `${detection.x2 - detection.x1}px`;
    annotationRect.style.height = `${detection.y2 - detection.y1}px`;
    annotationRect.style.border = "2px solid red";

    const label = document.createElement("div");
    label.className = "annotation-label";
    label.style.position = "absolute";
    label.style.left = `${detection.x1}px`;
    label.style.top = `${detection.y1 - 20}px`;
    //label.textContent = `${modelName}: ${detection.class} (${(detection.confidence * 100).toFixed(2)}%)`;
    videoContainer.appendChild(annotationRect);
    videoContainer.appendChild(label);

    requestAnimationFrame(() => captureAndSendAlt(cameraNumber));

  });
}

function drawAnnotationsModelPigFace(detections, modelName, cameraNumber) {
  const videoContainer = document.getElementById(
    "videoContainer" + cameraNumber
  );

  // Limpiar las anotaciones anteriores
  const rectangles = videoContainer.querySelectorAll(".annotation-rectangle");
  rectangles.forEach((rect) => rect.remove());

  // Dibujar nuevas anotaciones para este modelo
  detections.forEach((detection, index) => {
    const annotationRect = document.createElement("div");
    annotationRect.className = "annotation-rectangle";
    annotationRect.style.position = "absolute";
    annotationRect.style.left = `${detection.x1}px`;
    annotationRect.style.top = `${detection.y1}px`;
    annotationRect.style.width = `${detection.x2 - detection.x1}px`;
    annotationRect.style.height = `${detection.y2 - detection.y1}px`;
    annotationRect.style.border = "2px solid blue"; // Puedes cambiar el estilo según lo que prefieras

    // Etiqueta de texto (opcional)
    const label = document.createElement("div");
    label.className = "annotation-label";
    label.style.position = "absolute";
    label.style.left = `${detection.x1}px`;
    label.style.top = `${detection.y1 - 20}px`;
    //label.textContent = `${modelName}: ${detection.class} (${(detection.confidence * 100).toFixed(2)}%)`;
    videoContainer.appendChild(annotationRect);
    videoContainer.appendChild(label);
  });
}


function drawAnnotationsModelPigBehavior(detections, modelName, cameraNumber) {
  const videoContainer = document.getElementById(
    "videoContainer" + cameraNumber
  );

  // Limpiar las anotaciones anteriores
  const rectangles = videoContainer.querySelectorAll(".annotation-rectangle");
  rectangles.forEach((rect) => rect.remove());

  // Dibujar nuevas anotaciones para este modelo
  detections.forEach((detection, index) => {
    const annotationRect = document.createElement("div");
    annotationRect.className = "annotation-rectangle";
    annotationRect.style.position = "absolute";
    annotationRect.style.left = `${detection.x1}px`;
    annotationRect.style.top = `${detection.y1}px`;
    annotationRect.style.width = `${detection.x2 - detection.x1}px`;
    annotationRect.style.height = `${detection.y2 - detection.y1}px`;
    annotationRect.style.border = "2px solid pink"; // Puedes cambiar el estilo según lo que prefieras

    // Etiqueta de texto (opcional)
    const label = document.createElement("div");
    label.className = "annotation-label";
    label.style.position = "absolute";
    label.style.left = `${detection.x1}px`;
    label.style.top = `${detection.y1 - 20}px`;
    //label.textContent = `${modelName}: ${detection.class} (${(detection.confidence * 100).toFixed(2)}%)`;
    videoContainer.appendChild(annotationRect);
    videoContainer.appendChild(label);
  });
}

function drawAnnotationsModelPigDisease(detections, modelName, cameraNumber) {
  const videoContainer = document.getElementById(
    "videoContainer" + cameraNumber
  );

  // Limpiar las anotaciones anteriores
  const rectangles = videoContainer.querySelectorAll(".annotation-rectangle");
  rectangles.forEach((rect) => rect.remove());

  // Dibujar nuevas anotaciones para este modelo
  detections.forEach((detection, index) => {
    const annotationRect = document.createElement("div");
    annotationRect.className = "annotation-rectangle";
    annotationRect.style.position = "absolute";
    annotationRect.style.left = `${detection.x1}px`;
    annotationRect.style.top = `${detection.y1}px`;
    annotationRect.style.width = `${detection.x2 - detection.x1}px`;
    annotationRect.style.height = `${detection.y2 - detection.y1}px`;
    annotationRect.style.border = "2px solid blue"; // Puedes cambiar el estilo según lo que prefieras FALTA

    // Etiqueta de texto (opcional)
    const label = document.createElement("div");
    label.className = "annotation-label";
    label.style.position = "absolute";
    label.style.left = `${detection.x1}px`;
    label.style.top = `${detection.y1 - 20}px`;
    //label.textContent = `${modelName}: ${detection.class} (${(detection.confidence * 100).toFixed(2)}%)`;
    videoContainer.appendChild(annotationRect);
    videoContainer.appendChild(label);
  });
}

function drawAnnotationsModelPigEar(detections, modelName, cameraNumber) {
  const videoContainer = document.getElementById(
    "videoContainer" + cameraNumber
  );

  // Limpiar las anotaciones anteriores
  const rectangles = videoContainer.querySelectorAll(".annotation-rectangle");
  rectangles.forEach((rect) => rect.remove());

  // Dibujar nuevas anotaciones para este modelo
  detections.forEach((detection, index) => {
    const annotationRect = document.createElement("div");
    annotationRect.className = "annotation-rectangle";
    annotationRect.style.position = "absolute";
    annotationRect.style.left = `${detection.x1}px`;
    annotationRect.style.top = `${detection.y1}px`;
    annotationRect.style.width = `${detection.x2 - detection.x1}px`;
    annotationRect.style.height = `${detection.y2 - detection.y1}px`;
    annotationRect.style.border = "2px solid blue"; // Puedes cambiar el estilo según lo que prefieras  FALTA

    // Etiqueta de texto (opcional)
    const label = document.createElement("div");
    label.className = "annotation-label";
    label.style.position = "absolute";
    label.style.left = `${detection.x1}px`;
    label.style.top = `${detection.y1 - 20}px`;
    //label.textContent = `${modelName}: ${detection.class} (${(detection.confidence * 100).toFixed(2)}%)`;
    videoContainer.appendChild(annotationRect);
    videoContainer.appendChild(label);
  });
}

function drawAnnotationsModelPigPosition(detections, modelName, cameraNumber) {
  const videoContainer = document.getElementById(
    "videoContainer" + cameraNumber
  );

  // Limpiar las anotaciones anteriores
  const rectangles = videoContainer.querySelectorAll(".annotation-rectangle");
  rectangles.forEach((rect) => rect.remove());

  // Dibujar nuevas anotaciones para este modelo
  detections.forEach((detection, index) => {
    const annotationRect = document.createElement("div");
    annotationRect.className = "annotation-rectangle";
    annotationRect.style.position = "absolute";
    annotationRect.style.left = `${detection.x1}px`;
    annotationRect.style.top = `${detection.y1}px`;
    annotationRect.style.width = `${detection.x2 - detection.x1}px`;
    annotationRect.style.height = `${detection.y2 - detection.y1}px`;
    annotationRect.style.border = "2px solid blue"; // Puedes cambiar el estilo según lo que prefieras  FALTA

    // Etiqueta de texto (opcional)
    const label = document.createElement("div");
    label.className = "annotation-label";
    label.style.position = "absolute";
    label.style.left = `${detection.x1}px`;
    label.style.top = `${detection.y1 - 20}px`;
    //label.textContent = `${modelName}: ${detection.class} (${(detection.confidence * 100).toFixed(2)}%)`;
    videoContainer.appendChild(annotationRect);
    videoContainer.appendChild(label);
  });
}


// Llamar a ambos procesos cuando la página esté lista
//document.addEventListener("DOMContentLoaded", () => {
  //captureAndSendForMultipleModels();
//});

// Funciones para actualizar gráficos
function updateCharts(detections) {
  updateChart(detections); // Actualiza el gráfico de barras
  updatePercentageChart(detections); // Actualiza el gráfico circular
}
