
"use client";

import React from 'react';

// Using React.memo for performance optimization if children are not expected to change frequently
const StepContentWrapper = React.memo(({ children }: { children: React.ReactNode }) => (
  <div className="space-y-6 flex flex-col h-full animate-fade-in">
    {children}
  </div>
));
StepContentWrapper.displayName = 'StepContentWrapper';

export { StepContentWrapper };
