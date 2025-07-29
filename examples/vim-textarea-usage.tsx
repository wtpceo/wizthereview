// Example: How to replace regular Textarea with VimTextarea in your forms

import { VimTextarea } from "@/components/ui/vim-textarea"
import { Textarea } from "@/components/ui/textarea"

// Before (regular textarea):
export function BeforeExample() {
  return (
    <Textarea
      value={memo}
      onChange={(e) => setMemo(e.target.value)}
      placeholder="메모를 입력하세요"
      className="min-h-[100px]"
    />
  )
}

// After (vim-enabled textarea):
export function AfterExample() {
  return (
    <VimTextarea
      value={memo}
      onChange={(e) => setMemo(e.target.value)}
      placeholder="메모를 입력하세요 (Vim 모드 지원)"
      className="min-h-[100px]"
      enableVim={true}
      showVimIndicator={true}
      onYank={(text, type) => {
        // Optional: Handle yank events (e.g., show notification)
        console.log(`Yanked ${text.length} characters (${type})`)
      }}
    />
  )
}

// With toggle option:
export function ToggleableExample() {
  const [vimEnabled, setVimEnabled] = useState(false)
  
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <Switch
          id="vim-mode"
          checked={vimEnabled}
          onCheckedChange={setVimEnabled}
        />
        <Label htmlFor="vim-mode">Enable Vim Mode</Label>
      </div>
      
      <VimTextarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모를 입력하세요"
        className="min-h-[100px]"
        enableVim={vimEnabled}
        showVimIndicator={vimEnabled}
      />
    </div>
  )
}