'use client';
import dynamic from 'next/dynamic';

// Dynamically import the core object detection component with SSR disabled
const ObjectDetectorContent = dynamic(
  () => import('../components/ObjectDetectorContent'),
  { ssr: false }
);

export default function Page() {
  return <ObjectDetectorContent />;
}
