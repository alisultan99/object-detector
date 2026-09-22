'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function ObjectDetectorApp() {
  const [model, setModel] = useState(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isMounted, setIsMounted] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Ensure safe client-side loading
  useEffect(() => {
    setIsMounted(true);
    async function loadModel() {
      try {
        const tf = await import('@tensorflow/tfjs');
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        await tf.ready();
        const loadedModel = await cocoSsd.load();
        setModel(loadedModel);
        setLoadingModel(false);
      } catch (err) {
        console.error("Failed to load model:", err);
      }
    }
    loadModel();
  }, []);

  if (!isMounted) return null;

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    }
  };

  const getColorForClass = (className) => {
    let hash = 0;
    for (let i = 0; i < className.length; i++) {
      hash = className.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.abs(hash).toString(16).substring(0, 6);
    return '#' + '0'.repeat(6 - color.length) + color;
  };

  const startDetection = () => {
    if (!model || !videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    video.play();

    const renderPredictions = async () => {
      if (video.paused || video.ended) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const predictions = await model.detect(video);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      predictions.forEach((prediction) => {
        const [x, y, width, height] = prediction.bbox;
        const className = prediction.class;
        const score = Math.round(prediction.score * 100);
        const strokeColor = getColorForClass(className);

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);

        ctx.fillStyle = strokeColor;
        const textLabel = `${className}: ${score}%`;
        ctx.font = '16px Arial';
        const textWidth = ctx.measureText(textLabel).width;
        ctx.fillRect(x, y > 25 ? y - 25 : 0, textWidth + 10, 25);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(textLabel, x + 5, y > 25 ? y - 7 : 18);
      });

      requestAnimationFrame(renderPredictions);
    };

    renderPredictions();
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Live Video Object Detector</h1>
      
      {loadingModel ? (
        <p>Loading AI Model (COCO-SSD)... Please wait.</p>
      ) : (
        <p style={{ color: 'green' }}>AI Model Ready!</p>
      )}

      <div style={{ margin: '1rem 0' }}>
        <input type="file" accept="video/*" onChange={handleFileUpload} />
      </div>

      {videoUrl && (
        <div style={{ position: 'relative', display: 'inline-block', marginTop: '1rem' }}>
          <video
            ref={videoRef}
            src={videoUrl}
            onPlay={startDetection}
            controls
            style={{ display: 'block', maxWidth: '100%', maxHeight: '500px' }}
          />
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          />
        </div>
      )}
    </main>
  );
}
