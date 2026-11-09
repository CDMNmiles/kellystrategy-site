(() => {
 const dialog=document.getElementById('bc-player');if(!dialog)return;
 let origin=null;const frame=dialog.querySelector('.bc-player-frame');
 const close=()=>{frame.replaceChildren();dialog.close();document.body.style.overflow='';origin?.focus();};
 document.addEventListener('click',e=>{const a=e.target.closest('[data-bc-watch]');if(!a)return;
 const id=a.dataset.bcWatch;if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
 e.preventDefault();origin=a;document.getElementById('bc-player-title').textContent=a.dataset.bcTitle;document.getElementById('bc-original').href=a.href;
 const iframe=document.createElement('iframe');iframe.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1';iframe.title=a.dataset.bcTitle;iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';frame.replaceChildren(iframe);dialog.showModal();document.body.style.overflow='hidden';
 });
 document.getElementById('bc-player-close').addEventListener('click',close);
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
})();
