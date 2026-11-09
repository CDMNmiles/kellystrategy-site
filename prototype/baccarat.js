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

(() => {
 const stage=document.querySelector('.bc-spotlight');if(!stage)return;
 const track=stage.querySelector('[data-bc-spotlight-track]'),slides=[...stage.querySelectorAll('[data-bc-spotlight-slide]')],indicators=[...stage.querySelectorAll('[data-bc-spotlight-index]')];
 const previous=stage.querySelector('[data-bc-spotlight-prev]'),next=stage.querySelector('[data-bc-spotlight-next]'),toggle=stage.querySelector('[data-bc-spotlight-toggle]'),live=stage.querySelector('[data-bc-spotlight-live]');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let current=0,rotation=!reduced,hovered=false,focused=false,visible=true,timer=0;
 function schedule(){clearTimeout(timer);if(rotation&&!hovered&&!focused&&visible&&!document.hidden)timer=setTimeout(()=>{show(current+1);schedule();},12000);}
 function show(index){current=(index+slides.length)%slides.length;track.style.transform=`translateX(-${current*100}%)`;slides.forEach((slide,i)=>{const active=i===current;slide.setAttribute('aria-hidden',String(!active));slide.toggleAttribute('inert',!active);});indicators.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===current)));live.textContent=slides[current].querySelector('h2').textContent;}
 function updateToggle(){const label=rotation?'暫停自動輪播':'開始自動輪播';toggle.setAttribute('aria-label',label);toggle.title=label;toggle.textContent=rotation?'Ⅱ':'▶';}
 function manual(index){rotation=false;show(index);updateToggle();schedule();}
 previous.addEventListener('click',()=>manual(current-1));next.addEventListener('click',()=>manual(current+1));
 indicators.forEach((button,i)=>button.addEventListener('click',()=>manual(i)));
 toggle.addEventListener('click',()=>{rotation=!rotation;updateToggle();schedule();});
 stage.addEventListener('pointerenter',()=>{hovered=true;clearTimeout(timer);});
 stage.addEventListener('pointerleave',()=>{hovered=false;schedule();});
 stage.addEventListener('focusin',()=>{focused=true;clearTimeout(timer);});
 stage.addEventListener('focusout',()=>queueMicrotask(()=>{focused=stage.contains(document.activeElement);schedule();}));
 document.addEventListener('visibilitychange',schedule);
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.15}).observe(stage);
 show(0);updateToggle();schedule();
})();

(() => {
 const smooth=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
 document.querySelectorAll('.bc-row-shelf').forEach(shelf=>{
  const rail=shelf.querySelector('.bc-rail'),prev=shelf.querySelector('[data-bc-prev]'),next=shelf.querySelector('[data-bc-next]'),buttons=shelf.querySelector('.bc-row-buttons');
  const items=[...rail.children],key='bc-rail:'+rail.id;
  try{rail.scrollLeft=Number(sessionStorage.getItem(key)||0);}catch{}
  function update(){
   const max=rail.scrollWidth-rail.clientWidth;buttons.hidden=max<2;prev.disabled=rail.scrollLeft<2;next.disabled=max-rail.scrollLeft<2;
   try{sessionStorage.setItem(key,String(rail.scrollLeft));}catch{}
  }
  function move(direction){const width=items[0]?.getBoundingClientRect().width||rail.clientWidth;const gap=parseFloat(getComputedStyle(rail).columnGap)||20;const count=Math.max(1,Math.floor((rail.clientWidth+gap)/(width+gap)));rail.scrollBy({left:direction*count*(width+gap),behavior:smooth()});}
  prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
  rail.addEventListener('keydown',e=>{if(e.target!==rail)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}});
  let scheduled=false;rail.addEventListener('scroll',()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;update();});},{passive:true});
  new ResizeObserver(update).observe(rail);requestAnimationFrame(update);
 });
 const dir=document.querySelector('[data-bc-directory]');if(!dir)return;
 const search=document.getElementById('bc-directory-search'),sort=document.getElementById('bc-directory-sort'),access=document.getElementById('bc-directory-access'),catalog=document.getElementById('bc-catalog');
 const items=[...catalog.children].map((node,index)=>({node,index,title:node.dataset.bcSearch,views:node.dataset.bcViews===''?null:Number(node.dataset.bcViews),age:node.dataset.bcAge===''?null:Number(node.dataset.bcAge),access:node.dataset.bcAccess,topics:(node.dataset.bcTopics||'').split(/\s+/).filter(Boolean)}));
 const count=document.getElementById('bc-directory-count'),empty=document.getElementById('bc-directory-empty'),prev=document.getElementById('bc-page-prev'),next=document.getElementById('bc-page-next'),label=document.getElementById('bc-page-label');
 const size=Math.max(1,Number(dir.dataset.pageSize)||20);let state={q:'',sort:'selected',access:'',view:'grid',topic:'',page:1};
 const norm=s=>{let v=s.toLowerCase().replace(/\s+/g,'');for(const [a,b]of [['百家乐','百家樂'],['赌场','賭場'],['凯利','凱利'],['数据','數據'],['风控','風控'],['乱路','亂路'],['筹码','籌碼'],['会员','會員']])v=v.split(a).join(b);return v;};
 function read(){const p=new URLSearchParams(location.search);state={q:p.get('q')||'',sort:['selected','latest','views'].includes(p.get('sort'))?p.get('sort'):'selected',access:['public','member'].includes(p.get('access'))?p.get('access'):'',view:p.get('view')==='list'?'list':'grid',topic:p.get('topic')||'',page:Math.max(1,Number(p.get('page'))||1)};}
 function write(push=false){const p=new URLSearchParams();for(const key of ['q','sort','access','view','topic','page'])if(state[key]&&state[key]!==({sort:'selected',view:'grid',page:1}[key]))p.set(key,String(state[key]));const url=location.pathname+(p.size?'?'+p:'');if(url!==location.pathname+location.search)history[push?'pushState':'replaceState'](null,'',url);}
 function render(){
  let filtered=items.filter(i=>(!state.q||norm(i.title).includes(norm(state.q)))&&(!state.access||state.access===i.access)&&(!state.topic||i.topics.includes(state.topic)));
  if(state.sort==='views')filtered.sort((a,b)=>(b.views??-1)-(a.views??-1)||a.index-b.index);
  if(state.sort==='latest')filtered.sort((a,b)=>(a.age??Infinity)-(b.age??Infinity)||a.index-b.index);
  const pages=Math.max(1,Math.ceil(filtered.length/size));state.page=Math.min(Math.floor(state.page),pages);const from=(state.page-1)*size;
  const visible=new Set(filtered.slice(from,from+size).map(i=>i.node));for(const item of items)item.node.hidden=!visible.has(item.node);
  // Reorder the existing cards to retain the same links and player interaction.
  for(const item of filtered)catalog.append(item.node);
  catalog.classList.toggle('bc-catalog-grid',state.view==='grid');catalog.classList.toggle('bc-catalog-list',state.view==='list');
  search.value=state.q;sort.value=state.sort;access.value=state.access;
  document.querySelectorAll('[data-bc-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bcView===state.view)));
  document.querySelectorAll('[data-bc-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bcTopic===state.topic)));
  const activeTopic=state.topic?document.querySelector(`[data-bc-topic="${CSS.escape(state.topic)}"] .bc-topic-title`)?.textContent:'';
  count.textContent=filtered.length?`${activeTopic?`主題「${activeTopic}」 · `:''}找到 ${filtered.length} 支影片 · 顯示第 ${from+1}–${Math.min(from+size,filtered.length)} 支`:'找到 0 支影片';
  empty.hidden=filtered.length!==0;label.textContent=`第 ${state.page} / ${pages} 頁`;prev.disabled=state.page===1;next.disabled=state.page>=pages;
  dir.querySelector('.bc-pagination').hidden=filtered.length<=size;write();
 }
 function change(update,push=false,scroll=false){Object.assign(state,update);write(push);render();if(scroll)dir.scrollIntoView({behavior:smooth(),block:'start'});}
 let timer;search.addEventListener('input',()=>{clearTimeout(timer);const q=search.value;timer=setTimeout(()=>change({q,page:1}),180);});
 sort.addEventListener('change',()=>{clearTimeout(timer);change({q:search.value,sort:sort.value,page:1},true);});access.addEventListener('change',()=>{clearTimeout(timer);change({q:search.value,access:access.value,page:1},true);});
 document.querySelectorAll('[data-bc-view]').forEach(b=>b.addEventListener('click',()=>change({view:b.dataset.bcView},true)));
 document.querySelectorAll('[data-bc-topic]').forEach(b=>b.addEventListener('click',()=>change({topic:b.dataset.bcTopic,page:1},true,true)));
 prev.addEventListener('click',()=>change({page:state.page-1},true,true));next.addEventListener('click',()=>change({page:state.page+1},true,true));
 document.getElementById('bc-directory-reset').addEventListener('click',()=>{clearTimeout(timer);change({q:'',access:'',sort:'selected',topic:'',page:1},true);});
 addEventListener('popstate',()=>{clearTimeout(timer);read();render();});
 dir.querySelector('.bc-directory-controls').hidden=false;read();render();
})();
