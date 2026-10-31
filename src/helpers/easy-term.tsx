import type { ReactNode } from 'react';
import { Term } from '../components/report';
import { normalize } from '../utils/string/normalize';

const TERMS: Map<string, (displayWord: string) => ReactNode> = new Map();

export function addTerm(word: string, tooltip: ReactNode) {
  const termKey = normalize(word);

  if (TERMS.has(termKey)) {
    console.warn(`be careful as you are redefining the term "${termKey}"`);
  }

  TERMS.set(termKey, (displayWord) => <Term tooltip={tooltip}>{displayWord}</Term>);
}

function EasyTerm({ keyOrWord, displayWord }: { keyOrWord: string; displayWord?: string }) {
  const renderTerm = TERMS.get(normalize(keyOrWord));
  if (!renderTerm) {
    console.error(`unknown term: ${keyOrWord}`);
    return <b>UNKNOWN_TERM</b>;
  }
  return renderTerm(displayWord ?? keyOrWord);
}

export function easyTerm(keyOrWord: string, displayWord?: string) {
  return <EasyTerm keyOrWord={keyOrWord} displayWord={displayWord} />;
}
