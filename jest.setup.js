require("jest-canvas-mock");

// Mock the HTML Image class so it triggers `onload` events.
// Phaser uses this to determine when the TextureManager is ready.
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

// Mock window.focus() which Phaser checks during boot.
window.focus = () => {};

// Stub this out to silence console warnings from Phaser.
console.warn = () => {};

require("phaser");
