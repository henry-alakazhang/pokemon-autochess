require("jest-canvas-mock");

const MockImage = class {
    onload;
    onerror;
    set src(_) {
        if (this.onload) {
            this.onload();
        }
    }
}
globalThis.Image = MockImage;
globalThis.HTMLImageElement = MockImage;

// Mock this which is needed for Phaser to initialise.
window.focus = () => {};

// Stub this out to silence console warnings from Phaser.
console.warn = () => {};

require("phaser");