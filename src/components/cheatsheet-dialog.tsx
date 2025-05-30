
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
import { useTranslation, KbdComponentPlaceholder } from '@/contexts/LanguageContext';

interface CheatsheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CheatsheetDialog({ isOpen, onClose }: CheatsheetDialogProps) {
  const { t, dir } = useTranslation();

  // Use KbdComponentPlaceholder for replacements
  const Kbd = (text: string) => <KbdComponentPlaceholder>{text}</KbdComponentPlaceholder>;

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
                <li>{t('cheatsheet.generalNav.tab', { '0': Kbd('Tab') })}</li>
                <li>{t('cheatsheet.generalNav.shiftTab', { '0': Kbd('Shift'), '1': Kbd('Tab') })}</li>
                <li>{t('cheatsheet.generalNav.enterSpace', { '0': Kbd('Enter'), '1': Kbd('Space') })}</li>
                <li>{t('cheatsheet.generalNav.esc', { '0': Kbd('Esc') })}</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-1">{t('cheatsheet.uploadStep.title')}</h3>
              <ul className="list-disc list-inside space-y-1 ps-2">
                <li>{t('cheatsheet.uploadStep.openDialog', { '0': Kbd('Enter'), '1': Kbd('Space') })}</li>
                <li>{t('cheatsheet.uploadStep.activateButtons', { '0': Kbd('Enter') })}</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-1">{t('cheatsheet.editStep.title')}</h3>
              <h4 className="font-medium text-sm mb-1 ms-2">{t('cheatsheet.editStep.mediaPlayer.title')}</h4>
              <ul className="list-disc list-inside space-y-1 ps-4">
                <li>{t('cheatsheet.editStep.mediaPlayer.controls', { '0': Kbd('Enter'), '1': Kbd('Space') })}</li>
                <li>{t('cheatsheet.editStep.mediaPlayer.sliders', { '0': Kbd('Arrow Keys') })}</li>
              </ul>
               <h4 className="font-medium text-sm mb-1 mt-2 ms-2">{t('cheatsheet.editStep.trackLang.title')}</h4>
              <ul className="list-disc list-inside space-y-1 ps-4">
                <li>{t('cheatsheet.editStep.trackLang.openDropdown')}</li>
                <li>{t('cheatsheet.editStep.trackLang.activateDropdown', { '0': Kbd('Enter'), '1': Kbd('Space') })}</li>
                <li>{t('cheatsheet.editStep.trackLang.navigateOptions', { '0': Kbd('Arrow Keys') })}</li>
                <li>{t('cheatsheet.editStep.trackLang.selectOption', { '0': Kbd('Enter') })}</li>
              </ul>
              <h4 className="font-medium text-sm mb-1 mt-2 ms-2">{t('cheatsheet.editStep.editor.title')}</h4>
              <ul className="list-disc list-inside space-y-1 ps-4">
                <li>{t('cheatsheet.editStep.editor.addNew', { '0': Kbd('Enter') })}</li>
                <li>{t('cheatsheet.editStep.editor.tabThrough')}</li>
                <li>{t('cheatsheet.editStep.editor.editTime')}</li>
                <li>{t('cheatsheet.editStep.editor.typeText', { '0': Kbd('Enter') })}</li>
                <li>{t('cheatsheet.editStep.editor.actionButtons', { '0': Kbd('Enter'), '1': Kbd('Space') })}</li>
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-base mb-1">{t('cheatsheet.exportStep.title')}</h3>
              <ul className="list-disc list-inside space-y-1 ps-2">
                <li>{t('cheatsheet.exportStep.buttons')}</li>
                <li>{t('cheatsheet.exportStep.activate', { '0': Kbd('Enter') })}</li>
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
