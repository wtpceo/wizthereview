import { renderHook, act } from '@testing-library/react'
import { useVimMode } from '@/hooks/use-vim-mode'

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
})

describe('useVimMode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Mode Management', () => {
    it('should start in normal mode by default', () => {
      const { result } = renderHook(() => useVimMode())
      expect(result.current.vimState.mode).toBe('normal')
    })

    it('should start in specified initial mode', () => {
      const { result } = renderHook(() => useVimMode({ initialMode: 'insert' }))
      expect(result.current.vimState.mode).toBe('insert')
    })

    it('should switch to insert mode on "i" key', () => {
      const { result } = renderHook(() => useVimMode())
      const mockEvent = {
        key: 'i',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(mockEvent)
      })

      expect(result.current.vimState.mode).toBe('insert')
      expect(mockEvent.preventDefault).toHaveBeenCalled()
    })

    it('should return to normal mode on Escape', () => {
      const { result } = renderHook(() => useVimMode({ initialMode: 'insert' }))
      const mockEvent = {
        key: 'Escape',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(mockEvent)
      })

      expect(result.current.vimState.mode).toBe('normal')
    })
  })

  describe('Yank Commands', () => {
    let mockTextarea: HTMLTextAreaElement

    beforeEach(() => {
      mockTextarea = {
        value: 'Hello world\nThis is a test\nVim mode rocks',
        selectionStart: 0,
        selectionEnd: 0,
        dispatchEvent: jest.fn()
      } as unknown as HTMLTextAreaElement
    })

    it('should yank current line with yy', async () => {
      const onYank = jest.fn()
      const { result } = renderHook(() => useVimMode({ onYank }))

      // Set textarea ref
      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
      })

      // Press 'y' twice
      const yEvent = {
        key: 'y',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(yEvent)
      })

      act(() => {
        result.current.handleKeyDown(yEvent)
      })

      expect(result.current.vimState.yankedText).toBe('Hello world\n')
      expect(result.current.vimState.lastYankType).toBe('line')
      expect(onYank).toHaveBeenCalledWith('Hello world\n', 'line')
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello world\n')
    })

    it('should yank word with yw', async () => {
      const onYank = jest.fn()
      const { result } = renderHook(() => useVimMode({ onYank }))

      mockTextarea.selectionStart = 0 // Start of "Hello"
      
      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
      })

      const yEvent = {
        key: 'y',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      const wEvent = {
        key: 'w',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(yEvent)
      })

      act(() => {
        result.current.handleKeyDown(wEvent)
      })

      expect(result.current.vimState.yankedText).toBe('Hello')
      expect(result.current.vimState.lastYankType).toBe('char')
      expect(onYank).toHaveBeenCalledWith('Hello', 'char')
    })

    it('should yank to end of line with y$', async () => {
      const onYank = jest.fn()
      const { result } = renderHook(() => useVimMode({ onYank }))

      mockTextarea.selectionStart = 6 // After "Hello "
      
      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
      })

      const yEvent = {
        key: 'y',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      const dollarEvent = {
        key: '$',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(yEvent)
      })

      act(() => {
        result.current.handleKeyDown(dollarEvent)
      })

      expect(result.current.vimState.yankedText).toBe('world')
      expect(result.current.vimState.lastYankType).toBe('char')
      expect(onYank).toHaveBeenCalledWith('world', 'char')
    })
  })

  describe('Visual Mode', () => {
    let mockTextarea: HTMLTextAreaElement

    beforeEach(() => {
      mockTextarea = {
        value: 'Hello world\nThis is a test',
        selectionStart: 0,
        selectionEnd: 5,
        dispatchEvent: jest.fn()
      } as unknown as HTMLTextAreaElement
    })

    it('should enter visual mode on v key', () => {
      const { result } = renderHook(() => useVimMode())
      
      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
      })

      const vEvent = {
        key: 'v',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(vEvent)
      })

      expect(result.current.vimState.mode).toBe('visual')
      expect(result.current.vimState.visualStart).toBe(0)
      expect(result.current.vimState.visualEnd).toBe(5)
    })

    it('should yank visual selection on y key', () => {
      const onYank = jest.fn()
      const { result } = renderHook(() => useVimMode())
      
      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
        result.current.setMode('visual')
        result.current.vimState.visualStart = 0
        result.current.vimState.visualEnd = 5
      })

      const yEvent = {
        key: 'y',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      // Need to manually update state for visual selection
      act(() => {
        const { textareaRef } = result.current
        ;(textareaRef as any).current = mockTextarea
        
        // Simulate being in visual mode with selection
        result.current.vimState.mode = 'visual'
        result.current.vimState.visualStart = 0
        result.current.vimState.visualEnd = 5
        
        result.current.handleKeyDown(yEvent)
      })

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello')
    })
  })

  describe('Register System', () => {
    let mockTextarea: HTMLTextAreaElement

    beforeEach(() => {
      mockTextarea = {
        value: 'Hello world\nThis is a test\nVim mode rocks',
        selectionStart: 0,
        selectionEnd: 0,
        dispatchEvent: jest.fn()
      } as unknown as HTMLTextAreaElement
    })

    it('should support named registers (a-z)', () => {
      const onYank = jest.fn()
      const { result } = renderHook(() => useVimMode({ onYank }))

      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
      })

      // Select register 'a' with "a
      const quoteEvent = {
        key: '"',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>
      
      const aEvent = {
        key: 'a',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      const yEvent = {
        key: 'y',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(quoteEvent)
        result.current.handleKeyDown(aEvent)
        result.current.handleKeyDown(yEvent)
        result.current.handleKeyDown(yEvent)
      })

      expect(result.current.vimState.registers['a']).toEqual({
        text: 'Hello world\n',
        type: 'line'
      })
    })

    it('should maintain numbered registers (0-9) history', () => {
      const { result } = renderHook(() => useVimMode())

      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
      })

      // Yank multiple times to fill numbered registers
      const yEvent = {
        key: 'y',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      // First yank
      act(() => {
        result.current.handleKeyDown(yEvent)
        result.current.handleKeyDown(yEvent)
      })

      // Update textarea and cursor for second yank
      mockTextarea.selectionStart = 12
      
      // Second yank
      act(() => {
        result.current.handleKeyDown(yEvent)
        result.current.handleKeyDown(yEvent)
      })

      expect(result.current.vimState.numberedRegisters[0].text).toBe('This is a test\n')
      expect(result.current.vimState.numberedRegisters[1].text).toBe('Hello world\n')
    })
  })

  describe('Advanced Yank Commands', () => {
    let mockTextarea: HTMLTextAreaElement

    beforeEach(() => {
      mockTextarea = {
        value: 'The quick brown fox jumps over the lazy dog',
        selectionStart: 4, // Start of "quick"
        selectionEnd: 4,
        dispatchEvent: jest.fn()
      } as unknown as HTMLTextAreaElement
    })

    it('should yank to end of word with ye', () => {
      const onYank = jest.fn()
      const { result } = renderHook(() => useVimMode({ onYank }))

      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
      })

      const yEvent = {
        key: 'y',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      const eEvent = {
        key: 'e',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(yEvent)
        result.current.handleKeyDown(eEvent)
      })

      expect(result.current.vimState.yankedText).toBe('quick')
      expect(onYank).toHaveBeenCalledWith('quick', 'char')
    })

    it('should yank backwards word with yb', () => {
      const onYank = jest.fn()
      const { result } = renderHook(() => useVimMode({ onYank }))

      mockTextarea.selectionStart = 10 // Middle of "brown"

      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
      })

      const yEvent = {
        key: 'y',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      const bEvent = {
        key: 'b',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(yEvent)
        result.current.handleKeyDown(bEvent)
      })

      expect(result.current.vimState.yankedText).toBe('quick ')
    })
  })

  describe('Visual Block Mode', () => {
    let mockTextarea: HTMLTextAreaElement

    beforeEach(() => {
      mockTextarea = {
        value: 'Line 1\nLine 2\nLine 3',
        selectionStart: 0,
        selectionEnd: 7, // After "Line 1\n"
        dispatchEvent: jest.fn()
      } as unknown as HTMLTextAreaElement
    })

    it('should enter visual block mode on Ctrl-V', () => {
      const { result } = renderHook(() => useVimMode())

      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
      })

      const ctrlVEvent = {
        key: 'v',
        ctrlKey: true,
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(ctrlVEvent)
      })

      expect(result.current.vimState.mode).toBe('visual-block')
      expect(ctrlVEvent.preventDefault).toHaveBeenCalled()
    })
  })

  describe('Paste Operation', () => {
    let mockTextarea: HTMLTextAreaElement

    beforeEach(() => {
      mockTextarea = {
        value: 'Hello world',
        selectionStart: 5,
        selectionEnd: 5,
        dispatchEvent: jest.fn()
      } as unknown as HTMLTextAreaElement
    })

    it('should paste yanked text at cursor with p key', () => {
      const { result } = renderHook(() => useVimMode())
      
      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
        // Simulate having yanked text
        result.current.vimState.yankedText = ' test'
        result.current.vimState.lastYankType = 'char'
      })

      const pEvent = {
        key: 'p',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(pEvent)
      })

      expect(mockTextarea.value).toBe('Hello test world')
      expect(mockTextarea.dispatchEvent).toHaveBeenCalled()
    })

    it('should paste line yanks on new line', () => {
      const { result } = renderHook(() => useVimMode())
      
      mockTextarea.value = 'Line 1\nLine 2'
      mockTextarea.selectionStart = 0
      
      act(() => {
        ;(result.current.textareaRef as any).current = mockTextarea
        // Simulate having yanked a line
        result.current.vimState.yankedText = 'New line\n'
        result.current.vimState.lastYankType = 'line'
      })

      const pEvent = {
        key: 'p',
        preventDefault: jest.fn()
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleKeyDown(pEvent)
      })

      expect(mockTextarea.value).toBe('Line 1\nNew line\nLine 2')
    })
  })
})