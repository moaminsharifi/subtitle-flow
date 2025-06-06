
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
import type { LogEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface DebugLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  onClearLogs: () => void;
}

export function DebugLogDialog({ isOpen, onClose, logs, onClearLogs }: DebugLogDialogProps) {
  const { t, dir } = useTranslation();
  const getLogTypeClass = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      case 'success':
        return 'text-green-500';
      case 'debug':
        return 'text-blue-500';
      case 'info':
      default:
        return 'text-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] md:max-w-[80vw] lg:max-w-[60vw] h-[70vh] flex flex-col" dir={dir}>
        <DialogHeader>
          <DialogTitle>{t('debugLog.title')}</DialogTitle>
          <DialogDescription>
            {t('debugLog.description')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow border rounded-md p-2 bg-muted/30 text-xs">
          {logs.length === 0 && <p className="text-muted-foreground p-4 text-center">{t('debugLog.noEntries')}</p>}
          {logs.map((log) => (
            <div key={log.id} className="py-1 border-b border-border/50 last:border-b-0 font-mono">
              <span className="text-muted-foreground tabular-nums">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <span className={cn("mx-2", getLogTypeClass(log.type))}> {/* Use mx-2 for bidirectional margin */}
                [{log.type.toUpperCase()}]
              </span>
              <span className={dir === 'rtl' ? "mr-2" : "ml-2"}>{log.message}</span>
            </div>
          ))}
        </ScrollArea>
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClearLogs}>
            {t('debugLog.buttons.clear')}
          </Button>
          <DialogClose asChild>
            <Button type="button">
              {t('debugLog.buttons.close')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
