import { ImageResponse } from 'next/og'

export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: 'linear-gradient(135deg, #00d4ff, #4f52a0)',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 96,
          color: 'white',
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        ⚡
      </div>
    ),
    { ...size }
  )
}
