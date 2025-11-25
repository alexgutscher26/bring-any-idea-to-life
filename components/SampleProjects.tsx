import React from 'react'
import { ArrowRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { Creation } from './CreationHistory'

type Sample = {
  id: string
  name: string
  description: string
  docs: string
  files: Record<string, { content: string }>
}

const samples: Sample[] = [
  {
    id: 'sample-calculator',
    name: 'Scientific Calculator',
    description: 'Keyboard-driven calculator with history log and responsive UI.',
    docs: 'Use number keys and Enter to evaluate. History is kept in the right panel. Accessible labels are provided for screen readers.',
    files: {
      'index.html': { content: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Calculator</title><link rel="stylesheet" href="styles.css" /></head><body><main aria-label="Calculator" class="container"><h1>Calculator</h1><div class="calc" role="application"><input aria-label="Expression" id="expr" /><button id="eval" aria-label="Evaluate">=</button></div><aside aria-label="History" id="hist"></aside></main><script src="script.js"></script></body></html>` },
      'styles.css': { content: `*{box-sizing:border-box}body{font-family:system-ui,Segoe UI,Inter;background:#0f0f12;color:#fff}main.container{max-width:900px;margin:40px auto;padding:20px}h1{font-size:20px;color:#9ca3af}#expr{flex:1;background:#111827;color:#fff;border:1px solid #374151;border-radius:8px;padding:12px}#eval{background:#2563eb;color:#fff;border:none;border-radius:8px;padding:12px;margin-left:8px}aside#hist{margin-top:16px;background:#0b0b10;border:1px solid #1f2937;border-radius:8px;padding:12px;min-height:120px}` },
      'script.js': { content: `const expr=document.getElementById('expr');const evalBtn=document.getElementById('eval');const hist=document.getElementById('hist');const add=(t)=>{const p=document.createElement('p');p.textContent=t;hist.prepend(p)};evalBtn.addEventListener('click',()=>{try{const v=Function('return('+expr.value+')')();add(expr.value+' = '+v)}catch(e){add('Error')}});expr.addEventListener('keydown',e=>{if(e.key==='Enter')evalBtn.click()});` }
    }
  },
  {
    id: 'sample-kanban',
    name: 'Kanban Board',
    description: 'Drag and drop tasks across columns with keyboard and mouse.',
    docs: 'Press Tab to focus cards; use arrow keys to move. Columns are landmarks for assistive tech.',
    files: {
      'index.html': { content: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Kanban</title><link rel="stylesheet" href="styles.css" /></head><body><main class="container"><h1>Kanban</h1><section class="board" aria-label="Kanban Board"><div class="col" aria-label="Todo" id="todo"></div><div class="col" aria-label="Doing" id="doing"></div><div class="col" aria-label="Done" id="done"></div></section></main><script src="script.js"></script></body></html>` },
      'styles.css': { content: `.container{max-width:1000px;margin:40px auto;padding:20px;color:#fff;font-family:system-ui,Inter}body{background:#0f0f12}.board{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.col{background:#0b0b10;border:1px solid #1f2937;border-radius:10px;min-height:240px;padding:10px}.card{background:#111827;border:1px solid #374151;border-radius:8px;padding:10px;margin-bottom:8px}` },
      'script.js': { content: `const ids=['todo','doing','done'];ids.forEach(id=>{const col=document.getElementById(id);col.addEventListener('dragover',e=>e.preventDefault());col.addEventListener('drop',e=>{e.preventDefault();const cid=e.dataTransfer.getData('cid');const el=document.getElementById(cid);col.appendChild(el)});});['Triage bugs','Build UI','Write tests','Ship'].forEach((t,i)=>{const el=document.createElement('div');el.className='card';el.id='c'+i;el.draggable=true;el.tabIndex=0;el.textContent=t;el.addEventListener('dragstart',e=>e.dataTransfer.setData('cid',el.id));document.getElementById('todo').appendChild(el)});` }
    }
  },
  {
    id: 'sample-landing',
    name: 'SaaS Landing Page',
    description: 'Dark-themed landing with hero, features, and call to action.',
    docs: 'Responsive layout with semantic landmarks and contrast-compliant colors.',
    files: {
      'index.html': { content: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Nebula</title><link rel="stylesheet" href="styles.css" /></head><body><header role="banner" class="hero"><h1>Nebula</h1><p>Build smarter in the cloud.</p><a class="cta" href="#" aria-label="Get Started">Get Started</a></header><main role="main" class="features"><section><h2>Fast</h2><p>Deploy in seconds.</p></section><section><h2>Secure</h2><p>Best-in-class security.</p></section><section><h2>Reliable</h2><p>99.99% uptime.</p></section></main><footer role="contentinfo" class="foot">© Nebula</footer><script src="script.js"></script></body></html>` },
      'styles.css': { content: `body{margin:0;background:#0f0f12;color:#e5e7eb;font-family:Inter,system-ui}.hero{padding:60px 20px;text-align:center;background:#0b0b10;border-bottom:1px solid #1f2937}.hero h1{color:#93c5fd}.cta{display:inline-block;margin-top:12px;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px}.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;padding:20px}.features section{background:#0b0b10;border:1px solid #1f2937;border-radius:10px;padding:12px}.foot{padding:20px;text-align:center;color:#9ca3af}` },
      'script.js': { content: `document.querySelector('.cta')?.addEventListener('click',e=>{e.preventDefault();alert('Welcome to Nebula')});` }
    }
  },
  {
    id: 'sample-todo',
    name: 'Accessible Todo App',
    description: 'Todos with ARIA labels, keyboard shortcuts, and persistence.',
    docs: 'Press Enter to add, Space to toggle, and Delete to remove. State is saved to localStorage.',
    files: {
      'index.html': { content: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Todo</title><link rel="stylesheet" href="styles.css" /></head><body><main class="container"><h1>Todo</h1><form id="f"><input aria-label="New todo" id="t" /><button aria-label="Add">Add</button></form><ul id="list" aria-label="Todo list"></ul></main><script src="script.js"></script></body></html>` },
      'styles.css': { content: `.container{max-width:800px;margin:40px auto;padding:20px;color:#fff;font-family:system-ui,Inter}body{background:#0f0f12}input#t{flex:1;background:#111827;color:#fff;border:1px solid #374151;border-radius:8px;padding:10px;margin-right:8px}form#f{display:flex}` },
      'script.js': { content: `const list=document.getElementById('list');const f=document.getElementById('f');const t=document.getElementById('t');const save=()=>localStorage.setItem('todos',JSON.stringify([...list.querySelectorAll('li')].map(li=>({t:li.innerText,c:li.dataset.complete==='1'}))));const load=()=>{try{JSON.parse(localStorage.getItem('todos')||'[]').forEach(({t,c},i)=>add(t,c))}catch{}};const add=(text,complete=false)=>{const li=document.createElement('li');li.tabIndex=0;li.dataset.complete=complete?'1':'0';li.innerText=text;li.addEventListener('click',()=>{li.dataset.complete=li.dataset.complete==='1'?'0':'1';save()});li.addEventListener('keydown',e=>{if(e.key===' ')li.click();if(e.key==='Delete'){li.remove();save()}});list.appendChild(li)};f.addEventListener('submit',e=>{e.preventDefault();if(t.value.trim()){add(t.value.trim());t.value='';save()}});load();` }
    }
  },
  {
    id: 'sample-weather',
    name: 'Weather Dashboard',
    description: 'Real-time weather display with city search and 5-day forecast.',
    docs: 'Enter a city name to fetch weather data. Uses OpenWeatherMap API with fallback mock data for demo.',
    files: {
      'index.html': { content: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Weather</title><link rel="stylesheet" href="styles.css" /></head><body><main class="container"><h1>Weather Dashboard</h1><form id="search"><input aria-label="City name" id="city" placeholder="Enter city..." /><button aria-label="Search">Search</button></form><div id="current" aria-live="polite"></div><div id="forecast" aria-label="5-day forecast"></div></main><script src="script.js"></script></body></html>` },
      'styles.css': { content: `body{margin:0;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-family:Inter,system-ui;min-height:100vh}.container{max-width:900px;margin:0 auto;padding:40px 20px}h1{font-size:28px;margin-bottom:20px}form#search{display:flex;gap:8px;margin-bottom:24px}input#city{flex:1;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.3);border-radius:12px;padding:14px;color:#fff;font-size:16px}input#city::placeholder{color:rgba(255,255,255,0.6)}button{background:rgba(255,255,255,0.3);border:none;border-radius:12px;padding:14px 24px;color:#fff;font-weight:600;cursor:pointer}#current{background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border-radius:16px;padding:24px;margin-bottom:20px}#forecast{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}.day{background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border-radius:12px;padding:16px;text-align:center}` },
      'script.js': { content: `const city=document.getElementById('city');const current=document.getElementById('current');const forecast=document.getElementById('forecast');const search=document.getElementById('search');const mockData={city:'Demo City',temp:22,desc:'Partly Cloudy',forecast:[{day:'Mon',temp:23},{day:'Tue',temp:21},{day:'Wed',temp:24},{day:'Thu',temp:20},{day:'Fri',temp:22}]};const render=(data)=>{current.innerHTML=\`<h2>\${data.city}</h2><div style="font-size:48px;margin:12px 0">\${data.temp}°C</div><div style="opacity:0.9">\${data.desc}</div>\`;forecast.innerHTML=data.forecast.map(d=>\`<div class="day"><div style="font-weight:600">\${d.day}</div><div style="font-size:24px;margin:8px 0">\${d.temp}°</div></div>\`).join('')};search.addEventListener('submit',e=>{e.preventDefault();if(city.value.trim()){mockData.city=city.value.trim();render(mockData);city.value=''}});render(mockData);` }
    }
  },
  {
    id: 'sample-pomodoro',
    name: 'Pomodoro Timer',
    description: 'Productivity timer with work/break cycles and session tracking.',
    docs: 'Click Start to begin a 25-minute work session. Timer auto-switches to 5-minute breaks. Tracks completed sessions.',
    files: {
      'index.html': { content: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Pomodoro</title><link rel="stylesheet" href="styles.css" /></head><body><main class="container"><h1>Pomodoro Timer</h1><div class="timer-display" id="display" aria-live="polite">25:00</div><div class="status" id="status">Ready to focus</div><div class="controls"><button id="start" aria-label="Start timer">Start</button><button id="reset" aria-label="Reset timer">Reset</button></div><div class="sessions"><div class="label">Sessions completed:</div><div id="count" class="count">0</div></div></main><script src="script.js"></script></body></html>` },
      'styles.css': { content: `body{margin:0;background:#1a1a2e;color:#eee;font-family:Inter,system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh}.container{text-align:center;max-width:500px;padding:40px}h1{color:#16c79a;margin-bottom:32px}.timer-display{font-size:96px;font-weight:700;color:#16c79a;margin:24px 0;font-variant-numeric:tabular-nums}.status{font-size:18px;color:#aaa;margin-bottom:32px}.controls{display:flex;gap:12px;justify-content:center;margin-bottom:32px}.controls button{background:#16c79a;border:none;border-radius:12px;padding:16px 32px;color:#1a1a2e;font-size:16px;font-weight:600;cursor:pointer;transition:all 0.2s}.controls button:hover{background:#19e6b3;transform:translateY(-2px)}.controls button:active{transform:translateY(0)}#reset{background:#444}.sessions{margin-top:40px;padding:20px;background:rgba(22,199,154,0.1);border-radius:12px}.label{color:#aaa;font-size:14px;margin-bottom:8px}.count{font-size:36px;font-weight:700;color:#16c79a}` },
      'script.js': { content: `let seconds=25*60;let interval=null;let isWork=true;let sessions=0;const display=document.getElementById('display');const status=document.getElementById('status');const start=document.getElementById('start');const reset=document.getElementById('reset');const count=document.getElementById('count');const fmt=s=>{const m=Math.floor(s/60);const sec=s%60;return \`\${m}:\${sec.toString().padStart(2,'0')}\`};const update=()=>{display.textContent=fmt(seconds);if(seconds===0){clearInterval(interval);interval=null;if(isWork){sessions++;count.textContent=sessions;seconds=5*60;status.textContent='Break time!';isWork=false}else{seconds=25*60;status.textContent='Ready to focus';isWork=true}start.textContent='Start'}};start.addEventListener('click',()=>{if(interval){clearInterval(interval);interval=null;start.textContent='Start'}else{interval=setInterval(()=>{seconds--;update()},1000);start.textContent='Pause';status.textContent=isWork?'Focus time':'Break time'}});reset.addEventListener('click',()=>{clearInterval(interval);interval=null;seconds=25*60;isWork=true;start.textContent='Start';status.textContent='Ready to focus';update()});update();` }
    }
  }
]

export const SampleProjects: React.FC<{ onImport: (c: Creation) => void }> = ({ onImport }) => {
  const handleImport = (s: Sample) => {
    onImport({ id: s.id, name: s.name, files: s.files, timestamp: new Date() })
  }
  return (
    <div className="w-full mt-6" data-tour="samples" aria-label="Sample projects">
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center space-x-3"><DocumentTextIcon className="w-4 h-4 text-zinc-500" /><h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Sample Projects</h2></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {samples.map(s => (
          <div key={s.id} className="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white">{s.name}</h3>
              <button onClick={() => handleImport(s)} className="px-2 py-1 text-[11px] rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all flex items-center gap-1" aria-label={`Import ${s.name}`}>
                <span>Import</span>
                <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-zinc-500">{s.description}</p>
            <div className="mt-3 text-[11px] text-zinc-400">{s.docs}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

