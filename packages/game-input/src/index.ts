/** Focus-scoped logical actions: no synthetic keyboard events dispatched globally. */
export type InputAction = "up" | "down" | "left" | "right" | "confirm" | "cancel" | "pause" | "primary" | "secondary";
export type InputSnapshot = Readonly<{ pressed: ReadonlySet<InputAction>; justPressed: ReadonlySet<InputAction> }>;
export type KeyBindings = Readonly<Record<string, InputAction>>;
export const DEFAULT_BINDINGS: KeyBindings = Object.freeze({
  ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  Enter: "confirm", Escape: "pause", Space: "primary",
});

export class ActionInput {
  private held = new Set<InputAction>();
  private newPresses = new Set<InputAction>();
  private active = true;
  constructor(private readonly bindings: KeyBindings = DEFAULT_BINDINGS) {}
  setActive(active: boolean): void {
    this.active = active;
    if (!active) this.clear();
  }
  keyDown(code: string): boolean {
    if (!this.active) return false;
    const action = this.bindings[code];
    if (!action) return false;
    this.press(action);
    return true;
  }
  keyUp(code: string): boolean {
    const action = this.bindings[code];
    if (!action) return false;
    this.release(action);
    return true;
  }
  press(action: InputAction): void {
    if (!this.active) return;
    if (!this.held.has(action)) this.newPresses.add(action);
    this.held.add(action);
  }
  release(action: InputAction): void { this.held.delete(action); }
  snapshot(): InputSnapshot {
    const result = { pressed: new Set(this.held), justPressed: new Set(this.newPresses) };
    this.newPresses.clear();
    return result;
  }
  clear(): void { this.held.clear(); this.newPresses.clear(); }
}
