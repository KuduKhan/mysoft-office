// Shared keyboard behavior for workspace dialogs and editor tool dialogs.
export function initializeDialogFocus(root,background,onClose){
  let returnFocus=null;
  let lastOutside=document.activeElement;
  let open=false;
  const controls=dialog=>[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')]
    .filter(el=>el.getClientRects().length&&!el.closest('[hidden],[inert]'));
  document.addEventListener('focusin',event=>{
    if(!root.contains(event.target)&&!open)lastOutside=event.target;
  });
  const sync=()=>{
    const dialog=root.querySelector('.modal');
    if(!dialog){
      if(open){
        open=false;background.inert=false;
        if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
        else background.querySelector('main')?.focus({preventScroll:true});
        returnFocus=null;
      }
      return;
    }
    if(!open){returnFocus=lastOutside;open=true;}
    background.inert=true;
    dialog.setAttribute('role','dialog');
    dialog.setAttribute('aria-modal','true');
    dialog.setAttribute('tabindex','-1');
    const heading=dialog.querySelector('h2');
    if(heading){heading.id='workspace-dialog-title';dialog.setAttribute('aria-labelledby',heading.id);}
    if(!dialog.contains(document.activeElement))(controls(dialog)[0]||dialog).focus({preventScroll:true});
  };
  new MutationObserver(sync).observe(root,{childList:true,subtree:true});
  document.addEventListener('keydown',event=>{
    const dialog=root.querySelector('.modal');
    if(!dialog)return;
    if(event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();onClose();return;
    }
    if(event.key!=='Tab')return;
    const items=controls(dialog),first=items[0],last=items.at(-1);
    if(!items.length){event.preventDefault();dialog.focus();return;}
    if(!dialog.contains(document.activeElement)||event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  },true);
}
