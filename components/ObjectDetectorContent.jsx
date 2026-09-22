'use client';
import React, { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export default function ObjectDetectorContent() {
  const [model, setModel] = useState(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isVideoEnded, setIsVideoEnded] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setIsVideoEnded(false);
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      setIsVideoEnded(false);
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      startDetection();
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

    const renderPredictions = async () => {
      if (video.paused || video.ended) {
        if (video.ended) setIsVideoEnded(true);
        return;
      }

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

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
        ctx.font = '15px Inter, sans-serif';
        const textWidth = ctx.measureText(textLabel).width;
        ctx.fillRect(x, y > 25 ? y - 25 : 0, textWidth + 12, 25);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(textLabel, x + 6, y > 25 ? y - 7 : 18);
      });

      requestAnimationFrame(renderPredictions);
    };

    renderPredictions();
  };

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '2rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      alignItem: 'center'
    }}>
      {/* Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          VisionAI Object Tracker
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1rem', margin: 0 }}>
          Real-time multi-class object tracking powered by TensorFlow.js
        </p>

        {/* Model Status Pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '1rem', padding: '6px 14px', backgroundColor: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: loadingModel ? '#f59e0b' : '#22c55e', boxShadow: loadingModel ? '0 0 8px #f59e0b' : '0 0 8px #22c55e' }}></span>
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#cbd5e1' }}>
            {loadingModel ? 'Loading COCO-SSD Model...' : 'AI Model Ready & Active'}
          </span>
        </div>
      </div>

      {/* Main Control Card */}
      <div style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '900px',
        width: '100%',
        margin: '0 auto',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Upload File Section */}
        <div style={{ marginBottom: '1.5rem', width: '100%', textAlign: 'center' }}>
          <label style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}>
            📁 Upload Video Sample
            <input type="file" accept="video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Video & Canvas Viewer Container */}
        {videoUrl ? (
          <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', backgroundColor: '#000000', borderRadius: '12px', overflow: 'hidden', border: '1px solid #334155' }}>
            <video
              ref={videoRef}
              src={videoUrl}
              onPlay={() => {
                setIsVideoEnded(false);
                startDetection();
              }}
              onEnded={() => setIsVideoEnded(true)}
              controls
              style={{ display: 'block', maxWidth: '100%', maxHeight: '550px' }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                height: '100%',
                pointerEvents: 'none'
              }}
            />
          </div>
        ) : (
          <div style={{
            width: '100%',
            height: '250px',
            border: '2px dashed #475569',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b'
          }}>
            <p style={{ fontSize: '1.1rem', margin: '0 0 8px 0' }}>No video uploaded yet</p>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Upload an MP4 or WebM file to start tracking objects</p>
          </div>
        )}

        {/* Restart Button Container */}
        {isVideoEnded && (
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={restartVideo}
              style={{
                padding: '12px 28px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItem: 'center',
                gap: '8px'
              }}
            >
              🔄 Replay & Restart Detection
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
