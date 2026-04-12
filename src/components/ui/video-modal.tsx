'use client'

type VideoInfo =
  | { type: 'youtube'; videoId: string; watchUrl: string }
  | { type: 'vimeo'; embedUrl: string; watchUrl: string }
  | { type: 'direct'; url: string }
  | { type: 'unknown'; url: string }

function resolveVideo(raw: string): VideoInfo {
  // YouTube
  const yt = raw.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  )
  if (yt) {
    return {
      type: 'youtube',
      videoId: yt[1]!,
      watchUrl: `https://www.youtube.com/watch?v=${yt[1]}`,
    }
  }

  // Vimeo
  const vimeo = raw.match(/(?:vimeo\.com\/)([0-9]+)/)
  if (vimeo) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeo[1]}?dnt=1&playsinline=1`,
      watchUrl: `https://vimeo.com/${vimeo[1]}`,
    }
  }

  // Direct video file
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(raw)) {
    return { type: 'direct', url: raw }
  }

  return { type: 'unknown', url: raw }
}

export default function VideoModal({
  url,
  onClose,
}: {
  url: string
  onClose: () => void
}) {
  const video = resolveVideo(url)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.88)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          backgroundColor: '#111317',
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid #2A2D34',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '13px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1F2227',
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: '#F0F0F0' }}>
            Video del ejercicio
          </p>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280',
              fontSize: 22,
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        {video.type === 'youtube' ? (
          // Thumbnail + play button → opens YouTube app / browser
          <a
            href={video.watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'block', textDecoration: 'none' }}
          >
            <div style={{ position: 'relative', backgroundColor: '#000' }}>
              {/* Thumbnail */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
                alt="Video thumbnail"
                style={{ width: '100%', display: 'block', aspectRatio: '16/9', objectFit: 'cover' }}
              />
              {/* Dark overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Play button */}
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255,0,0,0.92)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderTop: '11px solid transparent',
                      borderBottom: '11px solid transparent',
                      borderLeft: '18px solid #fff',
                      marginLeft: 4,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer label */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                backgroundColor: '#0F1014',
              }}
            >
              {/* YouTube logo mark */}
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                <rect width="20" height="14" rx="3" fill="#FF0000" />
                <path d="M8 4l5 3-5 3V4z" fill="white" />
              </svg>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#F0F0F0' }}>
                Reproducir en YouTube
              </p>
            </div>
          </a>
        ) : video.type === 'vimeo' ? (
          // Vimeo embeds reliably
          <div style={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#000' }}>
            <iframe
              src={video.embedUrl}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        ) : video.type === 'direct' ? (
          // Native video element
          <video
            src={video.url}
            controls
            playsInline
            style={{ width: '100%', display: 'block', maxHeight: 360, backgroundColor: '#000' }}
          />
        ) : (
          // Unknown URL — fallback link
          <div style={{ padding: 16 }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '13px 16px',
                backgroundColor: '#1F2227',
                borderRadius: 10,
                color: '#B5F23D',
                fontSize: 14,
                fontWeight: 600,
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Abrir video →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
