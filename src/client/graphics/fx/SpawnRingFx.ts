import { Colord } from "colord";
import { Fx } from "./Fx";

/**
 * Spawn indicator: 3 expanding rings in succession, player territory color.
 * Total duration ~3500ms. Each ring expands from 0 → maxRadius and fades out.
 */
export class SpawnRingFx implements Fx {
  private lifeTime = 0;
  private readonly totalDuration = 3500;
  private readonly ringCount = 3;
  private readonly ringDuration = 900; // ms each ring lives
  private readonly ringInterval = 1100; // ms between ring starts
  private readonly maxRadius = 60; // world-coordinate units
  private readonly lineWidth = 2;

  constructor(
    private x: number,
    private y: number,
    private color: Colord,
  ) {}

  renderTick(frameTime: number, ctx: CanvasRenderingContext2D): boolean {
    this.lifeTime += frameTime;
    if (this.lifeTime >= this.totalDuration) return false;

    for (let i = 0; i < this.ringCount; i++) {
      const ringStart = i * this.ringInterval;
      const ringAge = this.lifeTime - ringStart;
      if (ringAge <= 0) continue; // not started yet

      const t = ringAge / this.ringDuration;
      if (t >= 1) continue; // this ring finished

      const radius = t * this.maxRadius;
      const alpha = 1 - t; // fades out as it expands

      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = this.color.alpha(alpha).toRgbString();
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();
    }

    return true;
  }
}
