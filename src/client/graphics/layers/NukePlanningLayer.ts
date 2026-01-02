import { colord, Colord } from "colord";
import { EventBus } from "../../../core/EventBus";
import { Theme } from "../../../core/configuration/Config";
import { UnitType } from "../../../core/game/Game";
import { TileRef } from "../../../core/game/GameMap";
import { GameView } from "../../../core/game/GameView";
import { ParabolaPathFinder } from "../../../core/pathfinding/PathFinding";
import { AlternateViewEvent, MouseMoveEvent } from "../../InputHandler";
import { TransformHandler } from "../TransformHandler";
import { UIState } from "../UIState";
import { Layer } from "./Layer";

type PlannedPath = {
  from: TileRef;
  to: TileRef;
  color: Colord;
};

export class NukePlanningLayer implements Layer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private theme: Theme;
  private alternateView = false;
  private lastMouse: { x: number; y: number } | null = null;
  private plannedPath: PlannedPath | null = null;
  private lastQueryAt = 0;
  private lastRenderKey: string | null = null;
  private requestId = 0;

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
    private uiState: UIState,
  ) {
    this.theme = game.config().theme();
    this.canvas = document.createElement("canvas");
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2d context not supported");
    }
    this.context = ctx;
    this.canvas.width = this.game.width();
    this.canvas.height = this.game.height();
  }

  shouldTransform(): boolean {
    return true;
  }

  init() {
    this.eventBus.on(MouseMoveEvent, (e) => {
      this.lastMouse = { x: e.x, y: e.y };
    });
    this.eventBus.on(AlternateViewEvent, (e) => {
      this.alternateView = e.alternateView;
      this.lastRenderKey = null;
    });
  }

  tick() {
    if (
      this.uiState.ghostStructure !== UnitType.AtomBomb &&
      this.uiState.ghostStructure !== UnitType.HydrogenBomb
    ) {
      this.clearPath();
      return;
    }

    if (!this.lastMouse || !this.game.myPlayer()) {
      this.clearPath();
      return;
    }

    const targetTile = this.mouseToTile(this.lastMouse.x, this.lastMouse.y);
    if (targetTile === null) {
      this.clearPath();
      return;
    }

    const now = performance.now();
    if (now - this.lastQueryAt < 50) {
      this.renderPathIfNeeded();
      return;
    }
    this.lastQueryAt = now;

    const requestId = ++this.requestId;
    this.game
      .myPlayer()
      ?.actions(targetTile)
      .then((actions) => {
        if (requestId !== this.requestId) {
          return;
        }
        const buildable = actions.buildableUnits.find(
          (u) => u.type === this.uiState.ghostStructure,
        );
        if (!buildable || buildable.canBuild === false) {
          this.clearPath();
          return;
        }
        const spawnTile = buildable.canBuild;
        const myPlayer = this.game.myPlayer();
        if (!myPlayer) {
          this.clearPath();
          return;
        }
        this.plannedPath = {
          from: spawnTile,
          to: targetTile,
          color: myPlayer.territoryColor(),
        };
        this.lastRenderKey = null;
        this.renderPathIfNeeded();
      })
      .catch(() => {
        this.clearPath();
      });
  }

  renderLayer(context: CanvasRenderingContext2D) {
    context.drawImage(
      this.canvas,
      -this.game.width() / 2,
      -this.game.height() / 2,
      this.game.width(),
      this.game.height(),
    );
  }

  private mouseToTile(screenX: number, screenY: number): TileRef | null {
    const rect = this.transformHandler.boundingRect();
    if (!rect) return null;
    const localX = screenX - rect.left;
    const localY = screenY - rect.top;
    const world = this.transformHandler.screenToWorldCoordinates(localX, localY);
    if (!this.game.isValidCoord(world.x, world.y)) {
      return null;
    }
    return this.game.ref(world.x, world.y);
  }

  private renderPathIfNeeded() {
    if (!this.plannedPath) {
      this.clearPath();
      return;
    }
    const renderKey = [
      this.plannedPath.from,
      this.plannedPath.to,
      this.alternateView,
    ].join(":");
    if (this.lastRenderKey === renderKey) {
      return;
    }
    this.lastRenderKey = renderKey;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawLine(this.plannedPath.from, this.plannedPath.to, this.plannedPath);
  }

  private clearPath() {
    if (this.lastRenderKey === null && this.plannedPath === null) {
      return;
    }
    this.plannedPath = null;
    this.lastRenderKey = null;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawLine(from: TileRef, to: TileRef, planned: PlannedPath) {
    const pathFinder = new ParabolaPathFinder(this.game);
    pathFinder.computeControlPoints(
      from,
      to,
      this.game.config().defaultNukeSpeed(),
      true,
    );
    const tiles = pathFinder.allTiles();
    for (const tile of tiles) {
      this.paintCell(
        this.game.x(tile),
        this.game.y(tile),
        planned.color,
        150,
      );
    }
  }

  private paintCell(
    x: number,
    y: number,
    color: Colord,
    alpha: number,
  ) {
    if (this.alternateView) {
      this.context.fillStyle = this.theme.selfColor().toRgbString();
    } else {
      this.context.fillStyle = color.alpha(alpha / 255).toRgbString();
    }
    this.context.fillRect(x, y, 1, 1);
  }
}
