
"use client";

import type React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface CheatsheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CheatsheetDialog({ isOpen, onClose }: CheatsheetDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[70vw] lg:max-w-[50vw] h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Keyboard Cheatsheet & Tips</DialogTitle>
          <DialogDescription>
            Quick guide for using Subtitle Sync with your keyboard and other helpful tips.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow border rounded-md p-4 bg-muted/30 text-sm">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-1">General Navigation</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li><kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Tab</kbd>: Move to the next interactive element.</li>
                <li><kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Shift</kbd> + <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Tab</kbd>: Move to the previous interactive element.</li>
                <li><kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd> / <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Space</kbd>: Activate focused buttons or select items in a dropdown.</li>
                <li><kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Esc</kbd>: Close dialogs or popovers.</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-1">Upload Step (Step 1)</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Focus the "Media File" or "Subtitle File" input, then press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd> or <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Space</kbd> to open the file selection dialog.</li>
                <li>Tab to "Generate Full Subtitles with AI" or "Proceed to Edit" buttons and press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd>.</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-1">Edit Step (Step 2)</h3>
              <h4 className="font-medium text-sm mb-1 ml-2">Media Player:</h4>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Tab to player controls (Play/Pause, Rewind, Fast Forward, Volume, Subtitle Timing Shift). Activate with <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd> or <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Space</kbd>.</li>
                <li>Use <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Arrow Keys</kbd> (Left/Right) when focus is on the progress or volume sliders.</li>
              </ul>
               <h4 className="font-medium text-sm mb-1 mt-2 ml-2">Track & Language Selection:</h4>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Tab to the "Active Subtitle Track" or "Transcription Language" select boxes.</li>
                <li>Press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd> or <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Space</kbd> to open the dropdown.</li>
                <li>Use <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Arrow Keys</kbd> (Up/Down) to navigate options.</li>
                <li>Press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd> to select an option.</li>
              </ul>
              <h4 className="font-medium text-sm mb-1 mt-2 ml-2">Subtitle Editor:</h4>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>Tab to "Add New" button and press <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd>.</li>
                <li>Tab through each subtitle entry's Start Time, End Time, Text Area, Regenerate Button, and Delete Button.</li>
                <li>Edit time fields directly.</li>
                <li>Type in the Text Area. <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd> creates a new line.</li>
                <li>Activate Regenerate/Delete buttons with <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd> or <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Space</kbd>.</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-1">Export Step (Step 3)</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Tab to "Export as .SRT", "Export as .VTT", "Edit More", or "Start Over" buttons.</li>
                <li>Activate with <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Enter</kbd>.</li>
              </ul>
            </div>

            <Separator />

             <div>
              <h3 className="font-semibold text-base mb-1">Tips</h3>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Ensure your OpenAI API key is set in Settings for AI features.</li>
                <li>For full AI transcription, the "Default Language" in Settings will be used.</li>
                <li>For segment regeneration in the editor, the language selected in the editor's dropdown is used.</li>
                <li>Check the Debug Logs (clipboard icon) for detailed process information.</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
