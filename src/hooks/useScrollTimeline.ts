import { useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export interface CameraTimelineConfig {
  activeHotspotId: string | null;
  cameraTargetRef: React.RefObject<{ x: number; y: number; z: number }>;
}

export const stageTargets: Record<number, { x: number; y: number; z: number }> = {
  1: { x: 0, y: 0, z: 4.5 },
  2: { x: 0, y: 0.1, z: 2.2 },
  3: { x: 2.5, y: 0.4, z: 0.8 },
  4: { x: 0, y: 0.2, z: 4.5 },
};

export const useScrollTimeline = ({ activeHotspotId, cameraTargetRef }: CameraTimelineConfig) => {
  const [currentStage, setCurrentStage] = useState<number>(1);

  // Normalizes scroll input across devices. Without this, mouse-wheel
  // scrolling (which fires a handful of large discrete deltas) drives the
  // scrub-timeline smoothly, but trackpads (which fire a continuous stream
  // of tiny deltas plus momentum) fight the browser's native smooth-scroll
  // and ScrollTrigger's own recalculation on every one of those events,
  // which is what was dropping frames. This hands scroll handling to GSAP's
  // own requestAnimationFrame-driven loop instead, so both input types feed
  // the timeline at a consistent, cheap rate. Runs once for the app's
  // lifetime — deliberately outside the effect below, which legitimately
  // re-runs on hotspot changes.
  useEffect(() => {
    const normalizer = ScrollTrigger.normalizeScroll(true);
    return () => {
      if (normalizer && typeof (normalizer as any).kill === 'function') {
        (normalizer as any).kill();
      }
    };
  }, []);

  useEffect(() => {
    if (activeHotspotId) {
      ScrollTrigger.getAll().forEach((trigger) => trigger.disable());
      return;
    } else {
      ScrollTrigger.getAll().forEach((trigger) => trigger.enable());
    }

    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: '#scroll-container',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (self) => {
            const progress = self.progress;
            let nextStage = 1;
            if (progress < 0.25) nextStage = 1;
            else if (progress < 0.55) nextStage = 2;
            else if (progress < 0.85) nextStage = 3;
            else nextStage = 4;

            setCurrentStage((prev) => (prev !== nextStage ? nextStage : prev));
          },
        },
      });

      if (cameraTargetRef.current) {
        timeline.to(
          cameraTargetRef.current,
          {
            x: stageTargets[2].x,
            y: stageTargets[2].y,
            z: stageTargets[2].z,
            duration: 1,
            ease: 'power1.inOut',
          },
          0
        );

        timeline.to(
          cameraTargetRef.current,
          {
            x: stageTargets[3].x,
            y: stageTargets[3].y,
            z: stageTargets[3].z,
            duration: 1,
            ease: 'power1.inOut',
          },
          1
        );

        timeline.to(
          cameraTargetRef.current,
          {
            x: stageTargets[4].x,
            y: stageTargets[4].y,
            z: stageTargets[4].z,
            duration: 1,
            ease: 'power1.inOut',
          },
          2
        );
      }
    });

    return () => ctx.revert();
  }, [activeHotspotId, cameraTargetRef]);

  return { currentStage };
};
