'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppStore } from '../store/appStore';

export function SettingsPanel() {
  // Use individual selectors for state values
  const settings = useAppStore((state) => state.settings);
  const isSettingsOpen = useAppStore((state) => state.isSettingsOpen);
  
  // Use getState for actions to avoid re-render loops
  const handleOpenChange = (open: boolean) => useAppStore.getState().setSettingsOpen(open);
  const handleUpdateSettings = (newSettings: Partial<typeof settings>) => useAppStore.getState().updateSettings(newSettings);

  return (
    <Sheet open={isSettingsOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>
            Configure your API keys and prompt settings for AI features.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* API Key Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">API Configuration</h3>
            <div className="space-y-2">
              <Label htmlFor="groqApiKey" className="text-xs">
                Groq API Key
              </Label>
              <Input
                id="groqApiKey"
                type="password"
                placeholder="Enter your Groq API key"
                value={settings.groqApiKey}
                onChange={(e) =>
                  handleUpdateSettings({ groqApiKey: e.target.value })
                }
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally and never sent to our servers.
              </p>
            </div>
          </div>

          {/* Context Window */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Context Settings</h3>
            <div className="space-y-2">
              <Label htmlFor="contextWindow" className="text-xs">
                Context Window Size (entries)
              </Label>
              <Input
                id="contextWindow"
                type="number"
                min={1}
                max={50}
                value={settings.contextWindowSize}
                onChange={(e) =>
                  handleUpdateSettings({
                    contextWindowSize: parseInt(e.target.value) || 10,
                  })
                }
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Number of transcript entries to include in AI context.
              </p>
            </div>
          </div>

          {/* Prompts Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Prompt Configuration</h3>

            <div className="space-y-2">
              <Label htmlFor="livePrompt" className="text-xs">
                Live Suggestion Prompt
              </Label>
              <Textarea
                id="livePrompt"
                placeholder="Enter prompt for live suggestions..."
                value={settings.liveSuggestionPrompt}
                onChange={(e) =>
                  handleUpdateSettings({ liveSuggestionPrompt: e.target.value })
                }
                className="text-sm min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="detailedPrompt" className="text-xs">
                Detailed Answer Prompt
              </Label>
              <Textarea
                id="detailedPrompt"
                placeholder="Enter prompt for detailed answers..."
                value={settings.detailedAnswerPrompt}
                onChange={(e) =>
                  handleUpdateSettings({ detailedAnswerPrompt: e.target.value })
                }
                className="text-sm min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chatPrompt" className="text-xs">
                Chat Prompt
              </Label>
              <Textarea
                id="chatPrompt"
                placeholder="Enter prompt for chat responses..."
                value={settings.chatPrompt}
                onChange={(e) =>
                  handleUpdateSettings({ chatPrompt: e.target.value })
                }
                className="text-sm min-h-[80px]"
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
