// Centralized, testable shortcut resolution. Ignore browser reserved shortcuts.
export function studioShortcut(event){
  if(!event||event.altKey||!(event.ctrlKey||event.metaKey))return null;
  const key=String(event.key||'').toLowerCase();
  if(key==='k')return 'command-search';
  if(key==='s')return 'save';
  if(event.shiftKey&&key==='e')return 'export';
  if(event.shiftKey&&key==='n')return 'new-file';
  return null;
}
export function studioShortcutLabel(action,isMac=false){
  const mod=isMac?'⌘':'Ctrl';
  return ({
    'command-search':mod+'+K',
    'save':mod+'+S',
    'export':mod+'+Shift+E',
    'new-file':mod+'+Shift+N'
  })[action]||'';
}
