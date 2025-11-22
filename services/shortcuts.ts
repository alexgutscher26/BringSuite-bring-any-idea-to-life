export type KeyCombo = {
  key: string
  ctrl?: boolean
  meta?: boolean
  alt?: boolean
  shift?: boolean
}

export type ShortcutSequence = KeyCombo[]

export type Command = {
  id: string
  label: string
  sequences: ShortcutSequence[]
  contexts?: string[]
  enabled?: boolean
  when?: (state: Record<string, any>) => boolean
  run: () => void
}

export type ShortcutConfig = {
  activationDelayMs: number
  commands: Omit<Command, 'run' | 'when'>[]
}

type Registered = Command & { createdAt: number }

export class ShortcutManager {
  private commands: Map<string, Registered> = new Map()
  private currentContext: string = 'global'
  private state: Record<string, any> = {}
  private chordBuffer: KeyCombo[] = []
  private lastKeyTime = 0
  private activationDelayMs = 1500
  private listenersBound = false
  private feedbackHandler: ((cmd: Registered, combo: ShortcutSequence) => void) | null = null

  setActivationDelay(ms: number) {
    this.activationDelayMs = Math.max(100, ms)
  }

  setContext(ctx: string) {
    this.currentContext = ctx || 'global'
    this.resetChord()
  }

  setState(partial: Record<string, any>) {
    this.state = { ...this.state, ...partial }
  }

  setFeedbackHandler(handler: ((cmd: Registered, combo: ShortcutSequence) => void) | null) {
    this.feedbackHandler = handler
  }

  register(cmd: Command) {
    const existing = this.commands.get(cmd.id)
    const record: Registered = { ...cmd, enabled: cmd.enabled !== false, createdAt: Date.now() }
    this.commands.set(cmd.id, record)
    if (!existing) this.bind()
  }

  unregister(id: string) {
    this.commands.delete(id)
  }

  updateShortcut(id: string, sequences: ShortcutSequence[]) {
    const c = this.commands.get(id)
    if (!c) return
    c.sequences = sequences
  }

  enable(id: string, enabled: boolean) {
    const c = this.commands.get(id)
    if (!c) return
    c.enabled = enabled
  }

  list(): Registered[] {
    return Array.from(this.commands.values()).sort((a, b) => a.label.localeCompare(b.label))
  }

  conflicts(): { a: Registered; b: Registered; sequence: ShortcutSequence }[] {
    const items = this.list()
    const res: { a: Registered; b: Registered; sequence: ShortcutSequence }[] = []
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const A = items[i]
        const B = items[j]
        const ctxOverlap = this.contextsOverlap(A.contexts, B.contexts)
        if (!ctxOverlap) continue
        for (const sa of A.sequences) {
          for (const sb of B.sequences) {
            if (this.sequencesEqual(sa, sb)) res.push({ a: A, b: B, sequence: sa })
          }
        }
      }
    }
    return res
  }

  exportConfig(): ShortcutConfig {
    return {
      activationDelayMs: this.activationDelayMs,
      commands: this.list().map(c => ({ id: c.id, label: c.label, sequences: c.sequences, contexts: c.contexts, enabled: c.enabled }))
    }
  }

  importConfig(config: ShortcutConfig) {
    this.activationDelayMs = config.activationDelayMs || this.activationDelayMs
    config.commands.forEach(c => {
      const existing = this.commands.get(c.id)
      if (existing) {
        existing.label = c.label
        existing.sequences = c.sequences
        existing.contexts = c.contexts
        existing.enabled = c.enabled !== false
      }
    })
  }

  private bind() {
    if (this.listenersBound) return
    window.addEventListener('keydown', this.onKeyDown)
    this.listenersBound = true
  }

  private resetChord() {
    this.chordBuffer = []
    this.lastKeyTime = 0
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const now = Date.now()
    if (this.lastKeyTime && now - this.lastKeyTime > this.activationDelayMs) this.resetChord()
    this.lastKeyTime = now
    const combo = this.eventToCombo(e)
    this.chordBuffer.push(combo)
    const match = this.findMatch(this.chordBuffer)
    if (match) {
      e.preventDefault()
      this.resetChord()
      if (match.enabled !== false && (!match.when || match.when(this.state))) {
        match.run()
        if (this.feedbackHandler) this.feedbackHandler(match, match.sequences[0])
      }
    } else {
      const anyPrefix = this.anyPrefix(this.chordBuffer)
      if (!anyPrefix) this.chordBuffer = [combo]
    }
  }

  private contextsOverlap(a?: string[], b?: string[]) {
    const A = a && a.length ? a : ['global']
    const B = b && b.length ? b : ['global']
    return A.some(x => B.includes(x))
  }

  private sequencesEqual(a: ShortcutSequence, b: ShortcutSequence) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!this.combosEqual(a[i], b[i])) return false
    }
    return true
  }

  private combosEqual(a: KeyCombo, b: KeyCombo) {
    return a.key === b.key && !!a.ctrl === !!b.ctrl && !!a.meta === !!b.meta && !!a.alt === !!b.alt && !!a.shift === !!b.shift
  }

  private anyPrefix(buffer: KeyCombo[]): boolean {
    const cmds = this.list()
    for (const c of cmds) {
      for (const seq of c.sequences) {
        if (buffer.length <= seq.length) {
          let ok = true
          for (let i = 0; i < buffer.length; i++) {
            if (!this.combosEqual(buffer[i], seq[i])) { ok = false; break }
          }
          if (ok) return true
        }
      }
    }
    return false
  }

  private findMatch(buffer: KeyCombo[]): Registered | null {
    const cmds = this.list().filter(c => !c.contexts || c.contexts.includes(this.currentContext) || c.contexts.includes('global'))
    for (const c of cmds) {
      for (const seq of c.sequences) {
        if (this.sequencesEqual(buffer, seq)) return c
      }
    }
    return null
  }

  private eventToCombo(e: KeyboardEvent): KeyCombo {
    const key = this.normalizeKey(e)
    return { key, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey, shift: e.shiftKey }
  }

  private normalizeKey(e: KeyboardEvent): string {
    const k = e.key.toLowerCase()
    if (k === ' ') return 'space'
    if (k === 'escape') return 'esc'
    return k
  }
}

export function sequenceFromString(s: string): ShortcutSequence {
  const parts = s.split(' ').map(p => p.trim()).filter(Boolean)
  return parts.map(p => {
    const segs = p.split('+').map(x => x.trim().toLowerCase())
    const combo: KeyCombo = { key: '' }
    segs.forEach(x => {
      if (x === 'ctrl' || x === 'control') combo.ctrl = true
      else if (x === 'cmd' || x === 'meta') combo.meta = true
      else if (x === 'alt') combo.alt = true
      else if (x === 'shift') combo.shift = true
      else combo.key = x
    })
    return combo
  })
}

export function sequenceToString(seq: ShortcutSequence): string {
  return seq.map(c => [c.ctrl ? 'Ctrl' : null, c.meta ? 'Cmd' : null, c.alt ? 'Alt' : null, c.shift ? 'Shift' : null, c.key ? c.key.toUpperCase() : ''].filter(Boolean).join('+')).join(' ')
}
