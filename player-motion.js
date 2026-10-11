// Shared character motion for the handcrafted game and editable engine maps.
export class PlayerMotion {
  constructor({ height = 2.65, jumpSpeed = 7.3 } = {}) {
    this.standingHeight = height; this.jumpSpeed = jumpSpeed;
    this.crouched = false; this.crouchToggle = false; this.grounded = false;
    this.velocity = 0; this.jumpBuffer = 0; this.coyote = 0;
  }
  get height() { return this.standingHeight * (this.crouched ? .48 : 1); }
  requestJump() { this.jumpBuffer = .12; }
  toggleCrouch() { this.crouchToggle = !this.crouchToggle; }
  reset() { this.velocity = 0; this.jumpBuffer = 0; this.coyote = 0; this.grounded = false; this.crouchToggle = false; this.crouched = false; }
  stance(position, wantsCrouch, blocked) {
    if (wantsCrouch || this.crouchToggle) this.crouched = true;
    else if (!this.crouched || !blocked(position.x, position.y, position.z, this.standingHeight)) this.crouched = false;
    return this.crouched;
  }
  step(dt, { position: p, dx, dz, blocked, ground }) {
    const beforeGround = ground(p.x, p.z, p.y);
    const onFloor = Number.isFinite(beforeGround) && Math.abs(p.y - beforeGround) < .06 && this.velocity <= 0;
    this.coyote = onFloor ? .1 : Math.max(0, this.coyote - dt);
    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.crouched && this.jumpSpeed > 0) {
      this.velocity = this.jumpSpeed; this.jumpBuffer = 0; this.coyote = 0; this.grounded = false;
    }
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .08));
    const canStep = this.velocity <= 0 && Number.isFinite(beforeGround) && Math.abs(p.y - beforeGround) < .43;
    for (let i = 0; i < steps; i++) {
      const moveAxis = (nx, nz) => {
        const support = ground(nx, nz, p.y), candidateY = canStep && Number.isFinite(support) && support > p.y && support - p.y <= .42 ? support : p.y;
        if (!blocked(nx, candidateY, nz, this.height)) { p.x = nx; p.z = nz; p.y = candidateY; }
      };
      moveAxis(p.x + dx / steps, p.z); moveAxis(p.x, p.z + dz / steps);
    }
    const floor = ground(p.x, p.z, p.y);
    if (Number.isFinite(floor) && p.y - floor < .43 && p.y >= floor - .43 && this.velocity <= 0) {
      p.y = floor; this.velocity = 0; this.grounded = true; return;
    }
    this.grounded = false; this.velocity -= 14 * dt;
    const dy = this.velocity * dt, verticalSteps = Math.max(1, Math.ceil(Math.abs(dy) / .06));
    for (let i = 0; i < verticalSteps; i++) {
      const h = ground(p.x, p.z, p.y), nextY = p.y + dy / verticalSteps;
      if (this.velocity <= 0 && Number.isFinite(h) && nextY <= h) { p.y = h; this.velocity = 0; this.grounded = true; break; }
      if (blocked(p.x, nextY, p.z, this.height)) { this.velocity = 0; break; }
      p.y = nextY;
    }
  }
}
