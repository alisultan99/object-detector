'use client';
import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export default function ObjectDetectorApp() {
  const [model, setModel] = useState(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // 1. Load COCO-SSD Model on component mount
  useEffect(() => {
    async function loadModel() {
      try {
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

  // 2. Handle video file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setIsDetecting(false);
    }
  };

  // Generate consistent pseudo-random colors for different object classes
  const getColorForClass = (className) => {
    let hash = 0;
    for (let i = 0; i < className.length; i++) {
      hash = className.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = Math.abs(hash).toString(16).substring(0, 6);
    return '#' + '0'.repeat(6 - color.length) + color;
  };

  // 3. Main Detection Loop
  const startDetection = () => {
    if (!model || !videoRef.current || !canvasRef.current) return;
    setIsDetecting(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    video.play();

    const renderPredictions = async () => {
      if (video.paused || video.ended) {
        setIsDetecting(false);
        return;
      }

      // Match canvas dimensions to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Detect objects in the current video frame
      const predictions = await model.detect(video);

      // Clear canvas and draw current video frame image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw bounding boxes and multi-class labels
      predictions.forEach((prediction) => {
        const [x, y, width, height] = prediction.bbox;
        const className = prediction.class;
        const score = Math.round(prediction.score * 100);
        const strokeColor = getColorForClass(className);

        // Draw Bounding Box
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, width, height);

        // Draw Label Background & Text
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
          {/* Hidden video element feeding frames */}
          <video
            ref={videoRef}
            src={videoUrl}
            onPlay={startDetection}
            controls
            style={{ display: 'block', maxWidth: '100%', maxHeight: '500px' }}
          />
          {/* Canvas overlay displaying bounding boxes */}
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          />
        </div>
      )}
    </main>
  );
}
