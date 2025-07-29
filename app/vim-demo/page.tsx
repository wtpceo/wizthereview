"use client"

import { useState } from "react"
import { VimTextarea } from "@/components/ui/vim-textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { VimMode } from "@/hooks/use-vim-mode"

export default function VimDemoPage() {
  const [content, setContent] = useState(`Welcome to Vim Mode Demo!

Try these vim commands:
- Press 'i' to enter INSERT mode
- Press 'Escape' to return to NORMAL mode
- Press 'v' for VISUAL mode
- Press 'V' for VISUAL LINE mode
- Press 'Ctrl-V' for VISUAL BLOCK mode

Yank commands (in NORMAL mode):
- yy: Yank current line
- yw: Yank word from cursor
- yiw: Yank inner word
- y$: Yank to end of line
- y0: Yank to beginning of line
- yb: Yank backwards word
- ye: Yank to end of word
- yW: Yank WORD (space-delimited)
- yB: Yank backwards WORD
- y^: Yank to first non-whitespace

Register commands:
- "a then yank: Store in register 'a'
- "a then paste: Paste from register 'a'
- "0 to "9: Access numbered registers

Visual mode:
- Select text with 'v' then 'y' to yank
- Select lines with 'V' then 'y' to yank
- Select block with 'Ctrl-V' then 'y' to yank

Paste:
- Press 'p' to paste after cursor
- Press 'P' to paste before cursor

Happy editing!`)

  const [vimEnabled, setVimEnabled] = useState(true)
  const [showIndicator, setShowIndicator] = useState(true)
  const [currentMode, setCurrentMode] = useState<VimMode>('normal')
  const [yankHistory, setYankHistory] = useState<Array<{ text: string, type: string, timestamp: Date, register?: string }>>([])
  const [currentRegister, setCurrentRegister] = useState<string | null>(null)

  const handleYank = (text: string, type: 'char' | 'line' | 'block') => {
    setYankHistory(prev => [{
      text: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
      type,
      timestamp: new Date(),
      register: currentRegister || '"'
    }, ...prev.slice(0, 9)]) // Keep last 10 yanks
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Vim Mode Textarea Demo</CardTitle>
          <CardDescription>
            Experience vim-like editing in a web textarea component
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="vim-enabled"
                checked={vimEnabled}
                onCheckedChange={setVimEnabled}
              />
              <Label htmlFor="vim-enabled">Enable Vim Mode</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="show-indicator"
                checked={showIndicator}
                onCheckedChange={setShowIndicator}
              />
              <Label htmlFor="show-indicator">Show Mode Indicator</Label>
            </div>
          </div>

          {/* Current Mode Display */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Current Mode:</span>
            <Badge variant={currentMode === 'insert' ? 'default' : 'secondary'}>
              {currentMode.toUpperCase()}
            </Badge>
          </div>

          {/* Vim Textarea */}
          <VimTextarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            enableVim={vimEnabled}
            showVimIndicator={showIndicator}
            onVimModeChange={setCurrentMode}
            onYank={handleYank}
            className="min-h-[300px] font-mono"
            placeholder="Start typing or use vim commands..."
          />

          {/* Yank History */}
          {yankHistory.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Yank History</h3>
              <div className="space-y-1">
                {yankHistory.map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {item.type}
                      </Badge>
                      {item.register && item.register !== '"' && (
                        <Badge variant="secondary" className="text-xs">
                          reg: {item.register}
                        </Badge>
                      )}
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {item.text}
                      </code>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {item.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Reference */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="font-semibold mb-2">Quick Reference</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-1">Mode Switching</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li><code className="bg-muted px-1">i</code> - Insert mode</li>
                  <li><code className="bg-muted px-1">v</code> - Visual mode</li>
                  <li><code className="bg-muted px-1">V</code> - Visual line mode</li>
                  <li><code className="bg-muted px-1">Ctrl-V</code> - Visual block</li>
                  <li><code className="bg-muted px-1">Esc</code> - Normal mode</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-1">Yank Commands</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li><code className="bg-muted px-1">yy</code> - Yank line</li>
                  <li><code className="bg-muted px-1">yw</code> - Yank word</li>
                  <li><code className="bg-muted px-1">y$</code> - Yank to end</li>
                  <li><code className="bg-muted px-1">yb</code> - Yank back word</li>
                  <li><code className="bg-muted px-1">p/P</code> - Paste after/before</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-1">Registers</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li><code className="bg-muted px-1">"a-z</code> - Named registers</li>
                  <li><code className="bg-muted px-1">"0-9</code> - Number registers</li>
                  <li><code className="bg-muted px-1">"ayy</code> - Yank to 'a'</li>
                  <li><code className="bg-muted px-1">"ap</code> - Paste from 'a'</li>
                  <li><code className="bg-muted px-1">"</code> - Default register</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}