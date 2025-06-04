
"use client";

import type React from 'react';
import type { LogEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { SettingsIcon, ScrollText, HelpCircle, Github, Globe } from 'lucide-react';
import { SettingsDialog } from '@/components/settings-dialog';
import { DebugLogDialog } from '@/components/debug-log-dialog';
import { CheatsheetDialog } from '@/components/cheatsheet-dialog';

interface PageActionsProps {
  isSettingsDialogOpen: boolean;
  setIsSettingsDialogOpen: (isOpen: boolean) => void;
  isDebugLogDialogOpen: boolean;
  setIsDebugLogDialogOpen: (isOpen: boolean) => void;
  isCheatsheetDialogOpen: boolean;
  setIsCheatsheetDialogOpen: (isOpen: boolean) => void;
  logEntries: LogEntry[];
  clearLogs: () => void;
  addLog: (message: string, type?: LogEntry['type']) => void;
  t: (key: string, replacements?: Record<string, string | number | React.ReactNode>) => string | React.ReactNode;
  onSettingsDialogClose: () => void; // Callback for when settings dialog is closed
}

export function PageActions({
  isSettingsDialogOpen,
  setIsSettingsDialogOpen,
  isDebugLogDialogOpen,
  setIsDebugLogDialogOpen,
  isCheatsheetDialogOpen,
  setIsCheatsheetDialogOpen,
  logEntries,
  clearLogs,
  addLog,
  t,
  onSettingsDialogClose,
}: PageActionsProps) {
  return (
    <>
      {/* Floating action buttons */}

      {/* Footer */}
      <footer className="mt-10 pt-6 border-t border-border/80 text-center">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-foreground">{t('footer.features.title') as string}</h2>
          <p className="text-sm text-muted-foreground max-w-3xl mx-auto">
            {t('footer.features.description') as string}
          </p>
        </div>

        <p
          className="text-sm text-muted-foreground mb-4"
          dangerouslySetInnerHTML={{ __html: t('footer.copyright', {
            '0': '<a href="https://github.com/moaminsharifi/subtitle-flow" target="_blank" rel="noopener noreferrer" class="underline hover:text-primary transition-colors">Original concept</a>'
          }) as string }}
        />
        <div className="flex flex-col sm:flex-row justify-center items-center gap-x-6 gap-y-2 text-sm">
          <a
            href='https://github.com/moaminsharifi/subtitle-flow'
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary hover:underline transition-colors"
          >
            <Github className="h-4 w-4" />
            <span>{t('footer.projectRepository') as string}</span>
          </a>
          <span className="hidden sm:inline text-muted-foreground/50">|</span>
          <a
            href='https://subtitile-flow.moaminsharifi.com/'
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-muted-foreground hover:text-primary hover:underline transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span>{t('footer.projectWebsite') as string}</span>
          </a>
        </div>
        {/* Sponsorship Text */}
        <p className="text-sm text-muted-foreground mt-4">
          sponsored by{' '}
          <a href="https://avalai.ir" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
            AvalAI
          </a>
        </p>
      </footer>

      <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-50">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg"
          onClick={() => {
            setIsDebugLogDialogOpen(true);
            addLog("Debug log dialog opened.", "debug");
          }}
          aria-label={t('debugLog.title') as string}
          title={t('debugLog.title') as string}
        >
          <ScrollText className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg"
          onClick={() => {
            setIsCheatsheetDialogOpen(true);
            addLog("Cheatsheet dialog opened.", "debug");
          }}
          aria-label={t('cheatsheet.title') as string}
          title={t('cheatsheet.title') as string}
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg"
          onClick={() => {
            setIsSettingsDialogOpen(true);
            addLog("Settings dialog opened.", "debug");
          }}
          aria-label={t('settings.title') as string}
          title={t('settings.title') as string}
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </div>

      <SettingsDialog
        isOpen={isSettingsDialogOpen}
        onClose={() => {
          setIsSettingsDialogOpen(false);
          addLog("Settings dialog closed.", "debug");
          onSettingsDialogClose(); // Call the passed callback
        }}
        addLog={addLog}
      />
      <DebugLogDialog
        isOpen={isDebugLogDialogOpen}
        onClose={() => {
          setIsDebugLogDialogOpen(false);
          addLog("Debug log dialog closed.", "debug");
        }}
        logs={logEntries}
        onClearLogs={clearLogs}
      />
      <CheatsheetDialog
        isOpen={isCheatsheetDialogOpen}
        onClose={() => {
          setIsCheatsheetDialogOpen(false);
          addLog("Cheatsheet dialog closed.", "debug");
        }}
      />
    </>
  );
}
