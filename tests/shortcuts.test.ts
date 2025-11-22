import { describe, it, expect, vi } from 'vitest'
import { ShortcutManager, sequenceFromString, sequenceToString } from '../services/shortcuts'

describe('shortcut parsing', () => {
  it('parses simple combo', () => {
    const seq = sequenceFromString('Ctrl+S')
    expect(seq.length).toBe(1)
    expect(seq[0].ctrl).toBe(true)
    expect(seq[0].key).toBe('s')
  })
  it('parses chorded sequence', () => {
    const seq = sequenceFromString('Ctrl+K Ctrl+S')
    expect(seq.length).toBe(2)
    expect(seq[0].key).toBe('k')
    expect(seq[1].key).toBe('s')
  })
  it('stringifies sequence', () => {
    const s = sequenceToString([{ key: 'k', ctrl: true }, { key: 's', ctrl: true }])
    expect(s).toContain('Ctrl+K')
    expect(s).toContain('Ctrl+S')
  })
})

describe('ShortcutManager', () => {
  it('registers and triggers command', () => {
    const m = new ShortcutManager()
    const run = vi.fn()
    m.register({ id: 'save', label: 'Save', sequences: [[{ key: 's', ctrl: true }]], run })
    const e1 = new KeyboardEvent('keydown', { key: 's', ctrlKey: true })
    window.dispatchEvent(e1)
    expect(run).toHaveBeenCalledTimes(1)
  })
  it('handles chorded sequences respecting delay', () => {
    const m = new ShortcutManager()
    const run = vi.fn()
    m.setActivationDelay(1000)
    m.register({ id: 'saveAll', label: 'Save All', sequences: [[{ key: 'k', ctrl: true }, { key: 's', ctrl: true }]], run })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }))
    expect(run).toHaveBeenCalledTimes(1)
  })
  it('respects contexts', () => {
    const m = new ShortcutManager()
    const runA = vi.fn()
    const runB = vi.fn()
    m.register({ id: 'undo', label: 'Undo', sequences: [[{ key: 'z', ctrl: true }]], contexts: ['editor'], run: runA })
    m.register({ id: 'toggle', label: 'Toggle', sequences: [[{ key: 'k', ctrl: true }]], contexts: ['preview'], run: runB })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(runA).toHaveBeenCalledTimes(0)
    m.setContext('editor')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }))
    expect(runA).toHaveBeenCalledTimes(1)
  })
  it('detects conflicts', () => {
    const m = new ShortcutManager()
    const noop = () => {}
    m.register({ id: 'a', label: 'A', sequences: [[{ key: 's', ctrl: true }]], contexts: ['global'], run: noop })
    m.register({ id: 'b', label: 'B', sequences: [[{ key: 's', ctrl: true }]], contexts: ['global'], run: noop })
    const conflicts = m.conflicts()
    expect(conflicts.length).toBe(1)
  })
})
