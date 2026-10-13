export class InputHandler {
  constructor(game) {
    this.game = game;
    this.bind();
  }

  bind() {
    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') {
        this.game.moveLane(-1);
        event.preventDefault();
      } else if (key === 'arrowright' || key === 'd') {
        this.game.moveLane(1);
        event.preventDefault();
      } else if (key === ' ' || key === 'arrowup' || key === 'w') {
        this.game.requestJump();
        event.preventDefault();
      }
    });
  }
}
