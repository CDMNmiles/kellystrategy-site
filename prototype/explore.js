(() => {
 const key='kelly-reading-list-v1'; let saved=[]; let storageAvailable=true;
 try { saved=JSON.parse(localStorage.getItem(key)||'[]'); if(!Array.isArray(saved))saved=[]; } catch { saved=[];storageAvailable=false; }
 const isSaved=href=>saved.includes(href);
 function refreshButtons(){document.querySelectorAll('[data-save-content]').forEach(b=>{const active=isSaved(b.dataset.saveContent);b.textContent=active?'已加入清單 ✓':'＋ 加入我的清單';b.setAttribute('aria-pressed',String(active));});}
 function toggle(href){if(!storageAvailable){toast('此瀏覽器無法儲存清單，請允許本機儲存後再試。');return;}
 const next=isSaved(href)?saved.filter(x=>x!==href):[...saved,href];
 try {localStorage.setItem(key,JSON.stringify(next));saved=next;toast(isSaved(href)?'已加入本機閱讀清單':'已從清單移除');}catch{storageAvailable=false;toast('本機儲存不可用，這次變更未儲存。');}
 refreshButtons();if(render)render();}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-save-content]');if(b)toggle(b.dataset.saveContent);});
 let render=null;
 const mount=document.getElementById('explore-index');
 if(mount){
 const index=JSON.parse(mount.textContent), output=document.getElementById('explore-results'),count=document.getElementById('explore-count');
 const topic=document.getElementById('explore-topic'),type=document.getElementById('explore-type'),only=document.getElementById('explore-saved');
 const read=()=>{const p=new URLSearchParams(location.search);topic.value=p.get('topic')||'';type.value=p.get('format')||'';only.checked=p.get('saved')==='1';if(![...topic.options].some(o=>o.value===topic.value))topic.value='';if(![...type.options].some(o=>o.value===type.value))type.value='';};
 const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 render=()=>{const list=index.filter(i=>(!topic.value||i.category===topic.value)&&(!type.value||i.type===type.value)&&(!only.checked||isSaved(i.href)));output.replaceChildren();count.textContent=`${list.length} 項內容${only.checked?' · 我的清單':''}`;
 if(!list.length){const empty=node('div','explore-empty');empty.append(node('h2','','這個組合還沒有內容。'),node('p','','試試其他主題或內容形式。如果是閱讀清單，先把感興趣的作品加入。'));output.append(empty);}
 for(const item of list){const article=node('article','explore-card'),a=node('a','explore-visual');a.href=item.href;
 if(item.image){const img=node('img');img.src=item.image;img.alt=item.title;img.loading='lazy';a.append(img);}else a.append(node('span','',item.type));
 const body=node('div','explore-body'),title=node('a','',item.title);title.href=item.href;
 const label=node('div','module-top',item.type+' / '+({baccarat:'百家樂',slots:'老虎機',investigations:'賭場追查',commentary:'博彩雜談'}[item.category]||''));const h=node('h2');h.append(title);
 const save=node('button','save-content');save.type='button';save.dataset.saveContent=item.href;save.setAttribute('aria-label','收藏：'+item.title);
 body.append(label,h,node('p','',item.summary),save);article.append(a,body);output.append(article);}
 refreshButtons();};
 function changed(){const p=new URLSearchParams();if(topic.value)p.set('topic',topic.value);if(type.value)p.set('format',type.value);if(only.checked)p.set('saved','1');history.pushState(null,'',location.pathname+(p.size?'?'+p:''));render();}
 [topic,type,only].forEach(e=>e.addEventListener('change',changed));
 document.getElementById('explore-reset').addEventListener('click',()=>{topic.value='';type.value='';only.checked=false;changed();});
 addEventListener('popstate',()=>{read();render();});addEventListener('storage',e=>{if(e.key===key){try{const value=JSON.parse(e.newValue||'[]');saved=Array.isArray(value)?value:[];}catch{saved=[];}render();}});
 read();render();
 }
 refreshButtons();
})();
