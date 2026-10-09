// Turns the flat 2020 Skill rules text (extracted from the rulebook as one run-on block)
// into readable HTML: intro, Specialisation chips, a Difficulty ladder, labelled notes,
// Triggered Effects as a list and rulebook sidebars as boxed asides.
// Text that already contains HTML (hand-edited records) is returned unchanged.

const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const LADDER=['Easy','Normal','Tricky','Challenging','Complicated','Nearly Impossible','Almost Impossible'];
const NOTES=['Special Ace','Encumbrance','Gear','Save Throw','Opposed Check','NOTE'];
const LABEL_RE=new RegExp(
  '(Triggered Effect\\(s\\)|Triggered Effects?(?=:))(:?)(?=\\s)|'+
  '(Specializations?(?:\\(s\\))?|'+LADDER.map(l=>l.replace(/ /g,'\\s+')).join('|')+'|Special Ace(?:\\s*\\([^)]{1,40}\\))?|Encumbrance|Gear|Save Throw|Opposed Check|NOTE)(:)','g');

function inline(text){
  return esc(text.trim())
    .replace(/\{([^}]{1,60})\}/g,'<span class="ac-rule-ref">$1</span>')
    .replace(/\((\s*[+^\-]{1,3}[^)]{0,30})\)/g,'<code class="ac-rule-dice">($1)</code>');
}
function normalize(raw){
  return String(raw||'')
    .replace(/\u0084/g,' • ')
    .replace(/N\s?O\s?T\s?E\b/g,'NOTE:')
    // Running page headers extracted as spaced capitals ("P E R C E P T I O N S K I L L S").
    .replace(/(?:\b[A-Z] ){4,}[A-Z]\b/g,' ')
    .replace(/NOTE:\s*:/g,'NOTE:')
    .replace(/[ \t]+/g,' ')
    .trim();
}
// Rulebook sidebars arrive as an ALL-CAPS heading followed by their text.
function splitSidebars(text){
  const out=[];const re=/\b([A-Z]{3,}(?:[ ,&/]+[A-Z]{2,}){1,6})\b/g;let m,last=0;
  const marks=[];while((m=re.exec(text)))if(m[1]!=='NOTE')marks.push(m);
  if(!marks.length)return {main:text,sidebars:[]};
  const main=text.slice(0,marks[0].index);
  for(let i=0;i<marks.length;i++){const start=marks[i].index+marks[i][0].length,end=i+1<marks.length?marks[i+1].index:text.length;out.push({title:marks[i][1],body:text.slice(start,end).trim()});last=end;}
  return {main,sidebars:out};
}

export function formatSkillRules(raw){
  if(!raw)return '';
  if(/<\/?(p|div|ul|ol|br|h\d|table|section)\b/i.test(raw))return raw;
  const {main,sidebars}=splitSidebars(normalize(raw));
  const parts=[];let m,last=0,current={label:null,start:0};
  LABEL_RE.lastIndex=0;
  const segments=[];
  while((m=LABEL_RE.exec(main))){
    // Only treat a match as a label if it starts a sentence-ish boundary.
    const before=main.slice(Math.max(0,m.index-2),m.index);
    if(m.index>0&&!/[.\s)]\s?$|\s$/.test(before))continue;
    segments.push({label:current.label,text:main.slice(current.start,m.index)});
    current={label:(m[1]||m[3]).replace(/\s+/g,' '),start:m.index+m[0].length};
  }
  segments.push({label:current.label,text:main.slice(current.start)});

  const intro=[],ladder=[],notes=[],effects=[],effectIntro=[];let specs=[];
  for(const seg of segments){
    const text=seg.text.trim();if(!seg.label){if(text)intro.push(text);continue;}
    const label=seg.label;
    if(/^Specializations?/.test(label)){
      specs.push(...text.split(/,\s*/).map(s=>s.trim()).filter(Boolean));
      // The ladder's first label can glue onto the last specialisation ("Swim Easy").
      continue;
    }
    if(/^Triggered Effects?/.test(label)){
      for(const bullet of text.split('•').map(s=>s.trim()).filter(Boolean)){
        const mm=bullet.match(/^([^:()]{2,40}):\s*(.*)$/s);
        effects.push(mm?{name:mm[1].trim(),body:mm[2]}:{name:'',body:bullet});
      }
      continue;
    }
    const ladderName=LADDER.find(l=>l===label);
    if(ladderName){ladder.push({name:ladderName,body:text});continue;}
    notes.push({name:label==='NOTE'?'Note':label,body:text});
  }
  // Stray bullets that were not under a Triggered Effects label.
  for(const n of notes){if(n.body.includes('•')){const [head,...rest]=n.body.split('•');n.body=head;for(const b of rest){const mm=b.trim().match(/^([^:()]{2,40}):\s*(.*)$/s);effects.push(mm?{name:mm[1].trim(),body:mm[2]}:{name:'',body:b.trim()});}}}

  // Sub-labels inside a note ("... target. Armed: A character ...") become their own notes.
  for(let i=0;i<notes.length;i++){
    const m2=notes[i].body.match(/^(.*?[.!?\u201d"])\s+([A-Z][A-Za-z\-]+(?: [A-Z][A-Za-z\-]+){0,2}):\s+(.*)$/s);
    if(m2){notes.splice(i+1,0,{name:m2[2],body:m2[3]});notes[i].body=m2[1];}
  }
  const keptSidebars=[];for(const sb of sidebars){if(sb.body.replace(/[\s:.]/g,'').length<20){if(keptSidebars.length)keptSidebars[keptSidebars.length-1].body+=' '+sb.body;continue;}keptSidebars.push(sb);}
  if(intro.length)parts.push(`<p class="ac-rule-intro">${intro.map(inline).join(' ')}</p>`);
  if(specs.length)parts.push(`<div class="ac-rule-section"><h4>Specialisations</h4><div class="ac-rule-chips">${specs.map(s=>`<span>${inline(s)}</span>`).join('')}</div></div>`);
  if(ladder.length)parts.push(`<div class="ac-rule-section"><h4>Difficulty examples</h4><dl class="ac-rule-ladder">${ladder.map(r=>`<dt>${esc(r.name)}</dt><dd>${inline(r.body)}</dd>`).join('')}</dl></div>`);
  if(effects.length||effectIntro.length)parts.push(`<div class="ac-rule-section"><h4>Triggered Effects</h4>${effectIntro.length?`<p>${effectIntro.map(inline).join(' ')}</p>`:''}${effects.length?`<ul class="ac-rule-effects">${effects.map(e=>`<li>${e.name?`<strong>${inline(e.name)}</strong> `:''}${inline(e.body)}</li>`).join('')}</ul>`:''}</div>`);
  if(notes.length)parts.push(`<div class="ac-rule-section ac-rule-notes">${notes.filter(n=>n.body).map(n=>`<p><strong>${esc(n.name)}:</strong> ${inline(n.body)}</p>`).join('')}</div>`);
  for(const s of keptSidebars)parts.push(`<aside class="ac-rule-sidebar"><h4>${esc(s.title.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()))}</h4><p>${inline(s.body)}</p></aside>`);
  return parts.join('');
}
