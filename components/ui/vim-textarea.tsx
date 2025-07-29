import * as React from "react"
import { cn } from "@/lib/utils"
import { useVimMode, VimMode } from "@/hooks/use-vim-mode"
import { Badge } from "@/components/ui/badge"

interface VimTextareaProps extends Omit<React.ComponentProps<"textarea">, 'ref'> {
  enableVim?: boolean
  initialVimMode?: VimMode
  onVimModeChange?: (mode: VimMode) => void
  onYank?: (text: string, type: 'char' | 'line' | 'block') => void
  showVimIndicator?: boolean
}

const VimTextarea = React.forwardRef<HTMLTextAreaElement, VimTextareaProps>(({
  className,
  enableVim = true,
  initialVimMode = 'normal',
  onVimModeChange,
  onYank,
  showVimIndicator = true,
  onKeyDown,
  onSelect,
  ...props
}, forwardedRef) => {
  const {
    vimState,
    textareaRef,
    handleKeyDown,
    handleSelectionChange
  } = useVimMode({
    initialMode: initialVimMode,
    onModeChange: onVimModeChange,
    onYank
  })

  // Combine refs
  React.useImperativeHandle(forwardedRef, () => textareaRef.current!)

  // Handle key events
  const handleKeyDownWrapper = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (enableVim) {
      handleKeyDown(e)
    }
    onKeyDown?.(e)
  }, [enableVim, handleKeyDown, onKeyDown])

  // Handle selection changes
  const handleSelectWrapper = React.useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (enableVim) {
      handleSelectionChange()
    }
    onSelect?.(e)
  }, [enableVim, handleSelectionChange, onSelect])

  // Get mode indicator color
  const getModeColor = (mode: VimMode) => {
    switch (mode) {
      case 'normal':
        return 'bg-blue-500'
      case 'insert':
        return 'bg-green-500'
      case 'visual':
      case 'visual-line':
      case 'visual-block':
        return 'bg-purple-500'
      case 'command':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Get mode display text
  const getModeText = (mode: VimMode) => {
    switch (mode) {
      case 'normal':
        return 'NORMAL'
      case 'insert':
        return 'INSERT'
      case 'visual':
        return 'VISUAL'
      case 'visual-line':
        return 'V-LINE'
      case 'visual-block':
        return 'V-BLOCK'
      case 'command':
        return 'COMMAND'
      default:
        return mode.toUpperCase()
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          enableVim && vimState.mode !== 'insert' && "caret-transparent",
          className
        )}
        onKeyDown={handleKeyDownWrapper}
        onSelect={handleSelectWrapper}
        {...props}
      />
      
      {enableVim && showVimIndicator && (
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <Badge 
            className={cn(
              "text-white text-xs px-2 py-0.5",
              getModeColor(vimState.mode)
            )}
            variant="default"
          >
            {getModeText(vimState.mode)}
          </Badge>
          
          {vimState.commandBuffer && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              {vimState.commandBuffer}
            </Badge>
          )}
          
          {vimState.yankedText && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              Yanked: {vimState.yankedText.length} chars
            </Badge>
          )}
        </div>
      )}
    </div>
  )
})

VimTextarea.displayName = "VimTextarea"

export { VimTextarea }