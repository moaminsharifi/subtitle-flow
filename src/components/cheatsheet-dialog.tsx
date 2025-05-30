
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
import { useTranslation } from '@/contexts/LanguageContext';

interface CheatsheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CheatsheetDialog({ isOpen, onClose }: CheatsheetDialogProps) {
  const { t, dir } = useTranslation();

  const Kbd = ({ children }: { children: React.ReactNode }) => (
    <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
      {children}
    </kbd>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[70vw] lg:max-w-[50vw] h-[70vh] flex flex-col" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('cheatsheet.title')}</DialogTitle>
          <DialogDescription>
            {t('cheatsheet.description')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow border rounded-md p-4 bg-muted/30 text-sm">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-base mb-1">{t('cheatsheet.generalNav.title')}</h3>
              <ul className="list-disc list-inside space-y-1 ps-2">
                <li>{t('cheatsheet.generalNav.tab', { tabKey: <Kbd>Tab</Kbd> })}</li>
                <li>{t('cheatsheet.generalNav.shiftTab', { shiftKey: <Kbd>Shift</Kbd>, tabKey: <Kbd>Tab</Kbd> })}</li>
                <li>{t('cheatsheet.generalNav.enterSpace', { enterKey: <Kbd>Enter</Kbd>, spaceKey: <Kbd>Space</Kbd> })}</li>
                <li>{t('cheatsheet.generalNav.esc', { escKey: <Kbd>Esc</Kbd> })}</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-1">{t('cheatsheet.uploadStep.title')}</h3>
              <ul className="list-disc list-inside space-y-1 ps-2">
                <li>{t('cheatsheet.uploadStep.openDialog', { enterKey: <Kbd>Enter</Kbd>, spaceKey: <Kbd>Space</Kbd> })}</li>
                <li>{t('cheatsheet.uploadStep.activateButtons', { enterKey: <Kbd>Enter</Kbd> })}</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-1">{t('cheatsheet.editStep.title')}</h3>
              <h4 className="font-medium text-sm mb-1 ms-2">{t('cheatsheet.editStep.mediaPlayer.title')}</h4>
              <ul className="list-disc list-inside space-y-1 ps-4">
                <li>{t('cheatsheet.editStep.mediaPlayer.controls', { enterKey: <Kbd>Enter</Kbd>, spaceKey: <Kbd>Space</Kbd> })}</li>
                <li>{t('cheatsheet.editStep.mediaPlayer.sliders', { arrowKeys: <Kbd>Arrow Keys</Kbd> })}</li>
              </ul>
               <h4 className="font-medium text-sm mb-1 mt-2 ms-2">{t('cheatsheet.editStep.trackLang.title')}</h4>
              <ul className="list-disc list-inside space-y-1 ps-4">
                <li>{t('cheatsheet.editStep.trackLang.openDropdown')}</li>
                <li>{t('cheatsheet.editStep.trackLang.activateDropdown', { enterKey: <Kbd>Enter</Kbd>, spaceKey: <Kbd>Space</Kbd> })}</li>
                <li>{t('cheatsheet.editStep.trackLang.navigateOptions', { arrowKeys: <Kbd>Arrow Keys</Kbd> })}</li>
                <li>{t('cheatsheet.editStep.trackLang.selectOption', { enterKey: <Kbd>Enter</Kbd> })}</li>
              </ul>
              <h4 className="font-medium text-sm mb-1 mt-2 ms-2">{t('cheatsheet.editStep.editor.title')}</h4>
              <ul className="list-disc list-inside space-y-1 ps-4">
                <li>{t('cheatsheet.editStep.editor.addNew', { enterKey: <Kbd>Enter</Kbd> })}</li>
                <li>{t('cheatsheet.editStep.editor.tabThrough')}</li>
                <li>{t('cheatsheet.editStep.editor.editTime')}</li>
                <li>{t('cheatsheet.editStep.editor.typeText', { enterKey: <Kbd>Enter</Kbd> })}</li>
                <li>{t('cheatsheet.editStep.editor.actionButtons', { enterKey: <Kbd>Enter</Kbd>, spaceKey: <Kbd>Space</Kbd> })}</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-1">{t('cheatsheet.exportStep.title')}</h3>
              <ul className="list-disc list-inside space-y-1 ps-2">
                <li>{t('cheatsheet.exportStep.buttons')}</li>
                <li>{t('cheatsheet.exportStep.activate', { enterKey: <Kbd>Enter</Kbd> })}</li>
              </ul>
            </div>

            <Separator />

             <div>
              <h3 className="font-semibold text-base mb-1">{t('cheatsheet.tips.title')}</h3>
              <ul className="list-disc list-inside space-y-1 ps-2">
                <li>{t('cheatsheet.tips.apiKey')}</li>
                <li>{t('cheatsheet.tips.fullTranscriptionLang')}</li>
                <li>{t('cheatsheet.tips.segmentRegenLang')}</li>
                <li>{t('cheatsheet.tips.debugLogs')}</li>
              </ul>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button type="button">
              {t('cheatsheet.buttons.close')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
