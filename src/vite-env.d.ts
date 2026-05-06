/// <reference types="vite/client" />

declare module 'jsqr' {
  interface QRCode {
    data: string
    binaryData: number[]
    chunks: unknown[]
    version: number
    location: {
      topRightCorner: { x: number; y: number }
      topLeftCorner: { x: number; y: number }
      bottomRightCorner: { x: number; y: number }
      bottomLeftCorner: { x: number; y: number }
    }
  }

  interface Options {
    inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst'
  }

  function jsQR(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options?: Options
  ): QRCode | null

  export default jsQR
}