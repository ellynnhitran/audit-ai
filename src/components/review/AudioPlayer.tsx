import { useEffect, useRef, useState, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Play, Pause, RotateCcw } from 'lucide-react'
import type { TranscriptWord, Finding } from '@/types/database'

interface AudioPlayerProps {
  audioUrl: string
  transcript: TranscriptWord[]
  findings: Finding[]
  activeFindingId?: string
  onFindingClick?: (finding: Finding) => void
}

export function AudioPlayer({ audioUrl, transcript, findings, activeFindingId, onFindingClick }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const activeWordRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  useEffect(() => {
    if (activeFindingId) {
      const finding = findings.find(f => f.id === activeFindingId)
      if (finding?.location?.start_time !== undefined && audioRef.current) {
        audioRef.current.currentTime = finding.location.start_time
      }
    }
  }, [activeFindingId, findings])

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const restart = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.currentTime = 0
    setCurrentTime(0)
  }, [])

  const seekToWord = useCallback((word: TranscriptWord) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = word.start
    if (!isPlaying) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  function getWordFinding(wordIndex: number): Finding | undefined {
    return findings.find(f =>
      f.location?.type === 'audio' &&
      f.location.word_index !== undefined &&
      wordIndex >= f.location.word_index &&
      (f.location.end_time === undefined || transcript[wordIndex]?.start <= f.location.end_time)
    )
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex h-full flex-col">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Controls */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={togglePlay}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={restart}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(e) => {
                const time = Number(e.target.value)
                if (audioRef.current) audioRef.current.currentTime = time
                setCurrentTime(time)
              }}
              className="w-full accent-primary"
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Synchronized transcript */}
      <ScrollArea className="flex-1">
        <div className="p-6 text-sm leading-relaxed">
          {transcript.map((word, i) => {
            const isCurrent = currentTime >= word.start && currentTime < word.end
            const finding = getWordFinding(i)
            const isActiveFinding = finding?.id === activeFindingId

            return (
              <span
                key={i}
                ref={isCurrent ? activeWordRef : undefined}
                className={cn(
                  'cursor-pointer rounded-sm px-0.5 transition-all hover:bg-accent',
                  isCurrent && 'bg-primary/20 font-medium',
                  finding && finding.severity === 'major' && 'bg-red-200/60 dark:bg-red-900/40',
                  finding && finding.severity === 'minor' && 'bg-yellow-200/60 dark:bg-yellow-900/40',
                  finding && finding.severity === 'info' && 'bg-blue-200/60 dark:bg-blue-900/40',
                  isActiveFinding && 'ring-2 ring-primary',
                )}
                onClick={() => {
                  seekToWord(word)
                  if (finding) onFindingClick?.(finding)
                }}
                title={finding ? finding.title : `${word.start.toFixed(1)}s`}
              >
                {word.punctuated_word}{' '}
              </span>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
