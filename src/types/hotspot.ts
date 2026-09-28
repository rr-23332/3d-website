export interface HotspotData {
  id: string;
  title: string;
  category: string;
  description: string;
  position: [number, number, number];
  targetCameraPos: [number, number, number];
  specs: Record<string, string>;
}
