export interface SessionContext {
  pageUrl?: string;
  pageTitle?: string;
  pageDescription?: string;
  parentUrl?: string;
  parentTitle?: string;
  parentDescription?: string;
  parentPath?: string;
  browserLanguage?: string;
  referrer?: string;
}

let parentContext: Partial<SessionContext> = {};

export function setParentPageContext(context: Partial<SessionContext>) {
  parentContext = { ...parentContext, ...context };
}

export function collectSessionContext(): SessionContext {
  const description =
    document.querySelector('meta[name="description"]')?.getAttribute("content") ||
    undefined;

  return {
    pageUrl: window.location.href,
    pageTitle: document.title,
    pageDescription: description,
    browserLanguage: navigator.language,
    referrer: document.referrer || undefined,
    ...parentContext,
  };
}

export function initParentContextListener() {
  window.addEventListener("message", (event) => {
    if (event.data?.type === "shriram-amc-context") {
      setParentPageContext(event.data.context || {});
    }
  });
}

export function formatSessionContextBlock(context: SessionContext = {}): string {
  const lines: string[] = [];

  const add = (label: string, value?: string) => {
    if (value?.trim()) {
      lines.push(`- ${label}: ${value.trim()}`);
    }
  };

  add("Parent page URL", context.parentUrl || context.pageUrl);
  add("Parent page title", context.parentTitle || context.pageTitle);
  add("Parent page description", context.parentDescription || context.pageDescription);
  add("Page path", context.parentPath);
  add("Browser language hint", context.browserLanguage);
  add("Referrer", context.referrer);

  if (lines.length === 0) {
    return "No specific page context was provided. Treat the user as a general Shriram AMC website visitor.";
  }

  return lines.join("\n");
}
