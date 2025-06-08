
"use client";

import type React from 'react';
import type { LogEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  SettingsIcon, ScrollText, HelpCircle, Github, Globe,
  FileText, WandSparkles, Edit3, ShieldCheck, WifiOff, Languages as LanguagesIcon,
  Cpu, Zap, // Added Zap
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

// Dynamically import dialogs
const SettingsDialog = dynamic(() =>
  import('@/components/settings-dialog').then((mod) => mod.SettingsDialog)
);
const DebugLogDialog = dynamic(() =>
  import('@/components/debug-log-dialog').then((mod) => mod.DebugLogDialog)
);
const CheatsheetDialog = dynamic(() =>
  import('@/components/cheatsheet-dialog').then((mod) => mod.CheatsheetDialog)
);


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
  t: (key: string, replacements?: Record<string, string | number | React.ReactNode>) => string | React.ReactNode | any[];
  onSettingsDialogClose: () => void;
}

const iconMap: { [key: string]: React.ElementType } = {
  FileText,
  WandSparkles,
  Edit3,
  ShieldCheck,
  WifiOff,
  Languages: LanguagesIcon,
  Translate: LanguagesIcon,
  Cpu,
  Zap, // Added Zap to map
};


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
  const rawFeatures = t('footer.features.list');
  const features = Array.isArray(rawFeatures) ? rawFeatures as Array<{ iconName: string; title: string; description: string; }> : [];

  return (
    <>
      {/* Footer */}
      <footer className="mt-12 pt-8 border-t border-border/80">
        {features.length > 0 && (
          <div className="mb-10">
            <h2 className="text-2xl font-semibold mb-6 text-foreground text-center">{t('footer.features.title') as string}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 max-w-5xl mx-auto"> {/* Changed lg:grid-cols-3 to lg:grid-cols-2 */}
              {features.map((feature, index) => {
                const IconComponent = iconMap[feature.iconName];
                return (
                  <div key={index} className="flex flex-col items-center text-center p-5 rounded-lg bg-card shadow-sm hover:shadow-lg transition-shadow duration-200 ease-in-out">
                    {IconComponent && <IconComponent className="h-10 w-10 mb-4 text-primary" />}
                    <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center text-muted-foreground space-y-4 max-w-5xl mx-auto">
          <div className="space-y-2">
            <p
              className="text-sm"
              dangerouslySetInnerHTML={{ __html: t('footer.copyright', {
                '0': `<a href="https://github.com/moaminsharifi/subtitle-flow" target="_blank" rel="noopener noreferrer" class="underline hover:text-primary transition-colors">Subtitle Flow project</a>`,
                '1': `<a href="https://github.com/moaminsharifi" target="_blank" rel="noopener noreferrer follow" class="underline hover:text-primary transition-colors">Amin Sharifi (moaminsharifi)</a>`
              }) as string }}
            />
            <p className="text-sm">
              {t('footer.sponsoredBy') as string}{' '}
              <a href="https://avalai.ir" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
                AvalAI
              </a>
            </p>
          </div>
          <nav aria-label={t('footer.navigationLabel') as string}>
            <ul className="flex flex-col sm:flex-row justify-center items-center gap-x-3 gap-y-2 text-sm">
              <li>
                <a
                  href='https://github.com/moaminsharifi/subtitle-flow'
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                >
                  <Github className="h-4 w-4" />
                  <span>{t('footer.projectRepository') as string}</span>
                </a>
              </li>
              <li className="hidden sm:block" aria-hidden="true">|</li>
              <li>
                <a
                  href='https://subtitile-flow.moaminsharifi.com/'
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-primary hover:underline transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  <span>{t('footer.projectWebsite') as string}</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </footer>

      <div className="fixed bottom-4 right-4 flex flex-col space-y-2 z-50">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-lg bg-background hover:bg-accent/10"
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
          className="rounded-full shadow-lg bg-background hover:bg-accent/10"
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
          className="rounded-full shadow-lg bg-background hover:bg-accent/10"
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

      {isSettingsDialogOpen && (
        <SettingsDialog
          isOpen={isSettingsDialogOpen}
          onClose={() => {
            setIsSettingsDialogOpen(false);
            addLog("Settings dialog closed.", "debug");
            onSettingsDialogClose();
          }}
          addLog={addLog}
        />
      )}
      {isDebugLogDialogOpen && (
        <DebugLogDialog
          isOpen={isDebugLogDialogOpen}
          onClose={() => {
            setIsDebugLogDialogOpen(false);
            addLog("Debug log dialog closed.", "debug");
          }}
          logs={logEntries}
          onClearLogs={clearLogs}
        />
      )}
      {isCheatsheetDialogOpen && (
        <CheatsheetDialog
          isOpen={isCheatsheetDialogOpen}
          onClose={() => {
            setIsCheatsheetDialogOpen(false);
            addLog("Cheatsheet dialog closed.", "debug");
          }}
        />
      )}
    </>
  );
}
