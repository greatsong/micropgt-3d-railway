import { useState } from 'react'
import { isMuted, setMuted, startBgm, isBgmRunning } from '../../utils/morse.js'

/** 화면 구석의 소리 켜기/끄기 버튼. 음소거 해제 시 배경음이 꺼져 있으면 다시 켠다 */
export default function SoundToggle({ bgm = true }) {
  const [muted, setMutedState] = useState(isMuted())

  function toggle() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
    if (!next && bgm && !isBgmRunning()) startBgm()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={muted ? '소리 켜기' : '소리 끄기'}
      title={muted ? '소리 켜기' : '소리 끄기 (모스 부호 배경음)'}
      style={{
        position: 'fixed', right: 14, bottom: 14, zIndex: 50,
        width: 40, height: 40, borderRadius: '50%',
        border: '1px solid rgba(212,165,116,0.35)',
        background: 'rgba(8,13,8,0.85)', color: '#d4a574',
        fontSize: '1.05rem', cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
