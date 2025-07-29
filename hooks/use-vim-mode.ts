import { useState, useCallback, useRef, useEffect } from 'react'

export type VimMode = 'normal' | 'insert' | 'visual' | 'visual-line' | 'visual-block' | 'command'

export interface VimState {
  mode: VimMode
  yankedText: string
  visualStart: number | null
  visualEnd: number | null
  commandBuffer: string
  cursorPosition: number
  lastYankType: 'char' | 'line' | 'block' | null
  // Register system
  registers: {
    [key: string]: {
      text: string
      type: 'char' | 'line' | 'block'
    }
  }
  activeRegister: string | null
  // Numbered registers for yank history
  numberedRegisters: Array<{
    text: string
    type: 'char' | 'line' | 'block'
  }>
}

export interface VimHookProps {
  initialMode?: VimMode
  onModeChange?: (mode: VimMode) => void
  onYank?: (text: string, type: 'char' | 'line' | 'block') => void
}

export function useVimMode({
  initialMode = 'normal',
  onModeChange,
  onYank
}: VimHookProps = {}) {
  const [vimState, setVimState] = useState<VimState>({
    mode: initialMode,
    yankedText: '',
    visualStart: null,
    visualEnd: null,
    commandBuffer: '',
    cursorPosition: 0,
    lastYankType: null,
    registers: {
      '"': { text: '', type: 'char' }, // Default register
    },
    activeRegister: null,
    numberedRegisters: []
  })

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const commandTimeoutRef = useRef<NodeJS.Timeout>()

  // Update mode and trigger callback
  const setMode = useCallback((newMode: VimMode) => {
    setVimState(prev => {
      if (prev.mode !== newMode) {
        onModeChange?.(newMode)
      }
      return { ...prev, mode: newMode }
    })
  }, [onModeChange])

  // Get word boundaries
  const getWordBoundaries = useCallback((text: string, position: number) => {
    const wordRegex = /\w+/g
    let match
    while ((match = wordRegex.exec(text)) !== null) {
      if (match.index <= position && position <= match.index + match[0].length) {
        return { start: match.index, end: match.index + match[0].length }
      }
    }
    return null
  }, [])

  // Get inner word boundaries (excluding surrounding whitespace)
  const getInnerWordBoundaries = useCallback((text: string, position: number) => {
    const boundaries = getWordBoundaries(text, position)
    if (!boundaries) return null
    
    let start = boundaries.start
    let end = boundaries.end
    
    // Trim leading whitespace
    while (start > 0 && /\s/.test(text[start - 1])) {
      start--
    }
    
    return { start, end }
  }, [getWordBoundaries])

  // Yank text implementation with register support
  const yankText = useCallback((start: number, end: number, type: 'char' | 'line' | 'block' = 'char', blockText?: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const text = textarea.value
    let yankedText = ''

    if (type === 'block' && blockText) {
      yankedText = blockText
    } else if (type === 'line') {
      // Find line boundaries
      const lineStart = text.lastIndexOf('\n', start - 1) + 1
      const lineEnd = text.indexOf('\n', end)
      yankedText = text.substring(lineStart, lineEnd === -1 ? text.length : lineEnd + 1)
    } else {
      yankedText = text.substring(start, end)
    }

    setVimState(prev => {
      const registerName = prev.activeRegister || '"'
      const newRegisters = { ...prev.registers }
      
      // Store in specified register
      newRegisters[registerName] = { text: yankedText, type }
      
      // Also store in default register if not already targeting it
      if (registerName !== '"') {
        newRegisters['"'] = { text: yankedText, type }
      }
      
      // Update numbered registers (0-9)
      const newNumberedRegisters = [
        { text: yankedText, type },
        ...prev.numberedRegisters.slice(0, 9)
      ]
      
      return {
        ...prev,
        yankedText,
        lastYankType: type,
        registers: newRegisters,
        numberedRegisters: newNumberedRegisters,
        activeRegister: null // Reset active register after use
      }
    })

    onYank?.(yankedText, type)
    
    // Copy to clipboard
    navigator.clipboard.writeText(yankedText).catch(err => {
      console.error('Failed to copy to clipboard:', err)
    })
  }, [onYank])

  // Handle yank commands
  const handleYankCommand = useCallback((command: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const text = textarea.value
    const cursor = textarea.selectionStart

    switch (command) {
      case 'yy': {
        // Yank current line
        const lineStart = text.lastIndexOf('\n', cursor - 1) + 1
        const lineEnd = text.indexOf('\n', cursor)
        yankText(lineStart, lineEnd === -1 ? text.length : lineEnd, 'line')
        break
      }
      
      case 'yw': {
        // Yank word
        const boundaries = getWordBoundaries(text, cursor)
        if (boundaries) {
          yankText(cursor, boundaries.end, 'char')
        }
        break
      }
      
      case 'yiw': {
        // Yank inner word
        const boundaries = getInnerWordBoundaries(text, cursor)
        if (boundaries) {
          yankText(boundaries.start, boundaries.end, 'char')
        }
        break
      }
      
      case 'y$': {
        // Yank to end of line
        const lineEnd = text.indexOf('\n', cursor)
        yankText(cursor, lineEnd === -1 ? text.length : lineEnd, 'char')
        break
      }
      
      case 'y0': {
        // Yank to beginning of line
        const lineStart = text.lastIndexOf('\n', cursor - 1) + 1
        yankText(lineStart, cursor, 'char')
        break
      }
      
      case 'yb': {
        // Yank backwards word
        let pos = cursor - 1
        // Skip current word if we're in the middle of one
        while (pos > 0 && /\w/.test(text[pos])) pos--
        // Skip whitespace
        while (pos > 0 && /\s/.test(text[pos])) pos--
        // Find start of previous word
        while (pos > 0 && /\w/.test(text[pos - 1])) pos--
        yankText(pos, cursor, 'char')
        break
      }
      
      case 'ye': {
        // Yank to end of word
        let pos = cursor
        // Skip to end of current word
        while (pos < text.length && /\w/.test(text[pos])) pos++
        yankText(cursor, pos, 'char')
        break
      }
      
      case 'yW': {
        // Yank WORD (space-delimited)
        let pos = cursor
        while (pos < text.length && !/\s/.test(text[pos])) pos++
        yankText(cursor, pos, 'char')
        break
      }
      
      case 'yB': {
        // Yank backwards WORD (space-delimited)
        let pos = cursor - 1
        // Skip current WORD if we're in the middle
        while (pos > 0 && !/\s/.test(text[pos])) pos--
        // Skip whitespace
        while (pos > 0 && /\s/.test(text[pos])) pos--
        // Find start of previous WORD
        while (pos > 0 && !/\s/.test(text[pos - 1])) pos--
        yankText(pos, cursor, 'char')
        break
      }
      
      case 'y^': {
        // Yank to first non-whitespace character of line
        const lineStart = text.lastIndexOf('\n', cursor - 1) + 1
        let firstNonWhitespace = lineStart
        while (firstNonWhitespace < text.length && /\s/.test(text[firstNonWhitespace]) && text[firstNonWhitespace] !== '\n') {
          firstNonWhitespace++
        }
        yankText(firstNonWhitespace, cursor, 'char')
        break
      }
    }

    // Clear command buffer
    setVimState(prev => ({ ...prev, commandBuffer: '' }))
  }, [yankText, getWordBoundaries, getInnerWordBoundaries])

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const { mode, commandBuffer, visualStart } = vimState

    // Handle Escape key - return to normal mode
    if (e.key === 'Escape') {
      e.preventDefault()
      setMode('normal')
      setVimState(prev => ({
        ...prev,
        visualStart: null,
        visualEnd: null,
        commandBuffer: ''
      }))
      return
    }

    // Handle different modes
    switch (mode) {
      case 'normal': {
        e.preventDefault() // Prevent default typing in normal mode

        // Mode switching
        if (e.key === 'i') {
          setMode('insert')
          return
        }
        
        if (e.key === 'v') {
          setMode('visual')
          setVimState(prev => ({
            ...prev,
            visualStart: textareaRef.current?.selectionStart ?? 0,
            visualEnd: textareaRef.current?.selectionEnd ?? 0
          }))
          return
        }

        if (e.key === 'V') {
          setMode('visual-line')
          const cursor = textareaRef.current?.selectionStart ?? 0
          const text = textareaRef.current?.value ?? ''
          const lineStart = text.lastIndexOf('\n', cursor - 1) + 1
          const lineEnd = text.indexOf('\n', cursor)
          
          setVimState(prev => ({
            ...prev,
            visualStart: lineStart,
            visualEnd: lineEnd === -1 ? text.length : lineEnd
          }))
          return
        }

        // Visual block mode (Ctrl-V)
        if (e.key === 'v' && e.ctrlKey) {
          e.preventDefault()
          setMode('visual-block')
          setVimState(prev => ({
            ...prev,
            visualStart: textareaRef.current?.selectionStart ?? 0,
            visualEnd: textareaRef.current?.selectionEnd ?? 0
          }))
          return
        }

        // Handle register selection
        if (commandBuffer === '"' && /^[a-z0-9]$/i.test(e.key)) {
          setVimState(prev => ({ ...prev, activeRegister: e.key, commandBuffer: '' }))
          return
        }

        // Build command buffer
        const newCommand = commandBuffer + e.key
        setVimState(prev => ({ ...prev, commandBuffer: newCommand }))

        // Clear command buffer after a delay
        clearTimeout(commandTimeoutRef.current)
        commandTimeoutRef.current = setTimeout(() => {
          setVimState(prev => ({ ...prev, commandBuffer: '', activeRegister: null }))
        }, 1000)

        // Check for yank commands
        if (newCommand.startsWith('y') || (vimState.activeRegister && e.key === 'y')) {
          const yankCommand = vimState.activeRegister ? newCommand : newCommand
          const validYankCommands = ['yy', 'yw', 'yiw', 'y$', 'y0', 'yb', 'ye', 'yW', 'yB', 'y^']
          if (validYankCommands.includes(yankCommand) || (vimState.activeRegister && yankCommand === 'y')) {
            handleYankCommand(yankCommand)
          }
        }
        
        // Handle paste
        if (e.key === 'p' || e.key === 'P') {
          const textarea = textareaRef.current
          if (textarea) {
            const cursor = textarea.selectionStart
            const text = textarea.value
            
            // Get text from active register or default register
            const registerName = vimState.activeRegister || '"'
            let register = vimState.registers[registerName]
            
            // Check numbered registers if register is a number
            if (!register && /^[0-9]$/.test(registerName)) {
              const index = parseInt(registerName)
              if (index < vimState.numberedRegisters.length) {
                register = vimState.numberedRegisters[index]
              }
            }
            
            register = register || { text: '', type: 'char' }
            
            if (register.text) {
              if (register.type === 'line') {
                // Paste on new line
                if (e.key === 'p') {
                  // Paste after current line
                  const lineEnd = text.indexOf('\n', cursor)
                  const pastePosition = lineEnd === -1 ? text.length : lineEnd + 1
                  textarea.value = text.slice(0, pastePosition) + register.text + text.slice(pastePosition)
                  textarea.selectionStart = textarea.selectionEnd = pastePosition
                } else {
                  // 'P' - Paste before current line
                  const lineStart = text.lastIndexOf('\n', cursor - 1) + 1
                  textarea.value = text.slice(0, lineStart) + register.text + text.slice(lineStart)
                  textarea.selectionStart = textarea.selectionEnd = lineStart
                }
              } else {
                // Paste character-wise
                if (e.key === 'p') {
                  // Paste after cursor
                  const pastePosition = cursor + 1
                  textarea.value = text.slice(0, pastePosition) + register.text + text.slice(pastePosition)
                  textarea.selectionStart = textarea.selectionEnd = pastePosition
                } else {
                  // 'P' - Paste before cursor
                  textarea.value = text.slice(0, cursor) + register.text + text.slice(cursor)
                  textarea.selectionStart = textarea.selectionEnd = cursor
                }
              }
              
              // Trigger change event
              const event = new Event('input', { bubbles: true })
              textarea.dispatchEvent(event)
            }
          }
          setVimState(prev => ({ ...prev, commandBuffer: '', activeRegister: null }))
        }
        
        break
      }

      case 'visual':
      case 'visual-line':
      case 'visual-block': {
        if (e.key === 'y') {
          e.preventDefault()
          // Yank visual selection
          const start = Math.min(vimState.visualStart ?? 0, vimState.visualEnd ?? 0)
          const end = Math.max(vimState.visualStart ?? 0, vimState.visualEnd ?? 0)
          
          if (mode === 'visual-block') {
            // For visual block, we need to handle yanking a rectangular block
            const text = textareaRef.current?.value ?? ''
            const lines = text.split('\n')
            const startPos = vimState.visualStart ?? 0
            const endPos = vimState.visualEnd ?? 0
            
            // Calculate line and column positions
            let startLine = 0, startCol = 0, endLine = 0, endCol = 0
            let pos = 0
            
            for (let i = 0; i < lines.length; i++) {
              if (pos <= startPos && startPos <= pos + lines[i].length) {
                startLine = i
                startCol = startPos - pos
              }
              if (pos <= endPos && endPos <= pos + lines[i].length) {
                endLine = i
                endCol = endPos - pos
              }
              pos += lines[i].length + 1 // +1 for newline
            }
            
            // Extract block text
            const blockLines = []
            const minCol = Math.min(startCol, endCol)
            const maxCol = Math.max(startCol, endCol)
            
            for (let i = Math.min(startLine, endLine); i <= Math.max(startLine, endLine); i++) {
              if (i < lines.length) {
                blockLines.push(lines[i].substring(minCol, maxCol))
              }
            }
            
            const blockText = blockLines.join('\n')
            yankText(0, 0, 'block', blockText)
          } else {
            yankText(start, end, mode === 'visual-line' ? 'line' : 'char')
          }
          
          // Return to normal mode
          setMode('normal')
          setVimState(prev => ({
            ...prev,
            visualStart: null,
            visualEnd: null,
            commandBuffer: ''
          }))
        }
        break
      }

      case 'insert':
        // Allow normal typing in insert mode
        break
    }
  }, [vimState, setMode, handleYankCommand, yankText])

  // Update cursor position on selection change
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    setVimState(prev => ({
      ...prev,
      cursorPosition: textarea.selectionStart
    }))

    // Update visual selection
    if (vimState.mode === 'visual' || vimState.mode === 'visual-line') {
      setVimState(prev => ({
        ...prev,
        visualEnd: textarea.selectionEnd
      }))
    }
  }, [vimState.mode])

  return {
    vimState,
    textareaRef,
    handleKeyDown,
    handleSelectionChange,
    setMode,
    yankText
  }
}