"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

export default function QrScanner({
  onScan,
  paused,
}: {
  onScan: (value: string) => void;
  paused: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const onScanRef = useRef(onScan);
  const pausedRef = useRef(paused);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
    pausedRef.current = paused;
  }, [onScan, paused]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        tick();
      } catch {
        if (!cancelled) {
          setError(
            "No pudimos acceder a la cámara. Revisá los permisos del navegador para este sitio."
          );
        }
      }
    }

    function tick() {
      frameRef.current = requestAnimationFrame(tick);
      if (pausedRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result?.data) {
        onScanRef.current(result.data);
      }
    }

    start();

    return () => {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  return (
    <div style={{ position: "relative", borderRadius: 16, overflow: "hidden" }}>
      <video
        ref={videoRef}
        muted
        playsInline
        style={{ width: "100%", display: "block", background: "#000" }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
