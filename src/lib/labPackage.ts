import {strToU8,zipSync} from 'fflate'
import {personalizeText} from './personalize'
import {labMethodology} from '../data/methodology'
import type {Lab,SubjectArea,QualityProfile} from '../types'



import offlineCss from './offline.css?inline'
const fetchBytes=async(path:string)=>{const r=await fetch(import.meta.env.BASE_URL+path);if(!r.ok)throw Error(`Не найден файл ${path}`);return new Uint8Array(await r.arrayBuffer())}
const csv=(rows:(string|number)[][])=>'\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(';')).join('\r\n')
async function buildFiles({labs,area,profile,renderPage}:{labs:Lab[];area:SubjectArea;profile:QualityProfile;renderPage:(lab:Lab)=>string}){
 if(!labs.length)throw Error('Нет работ в комплекте')

 const files:Record<string,Uint8Array>={};
 const font=await fetchBytes('fonts/raleway-cyrillic.woff2');
 let binary='';for(const byte of font)binary+=String.fromCharCode(byte);
 const embeddedFont=btoa(binary);
 for(const lab of labs){
 const dir=labs.length===1?'':`ЛР${lab.slug}/`;
 files[dir+'Шаблон_для_заполнения.docx']=await fetchBytes('reports/'+lab.reportFile);
 const text=(value:string)=>personalizeText(value,lab.number,area);
 const csvNames:string[]=[];
 lab.sourceData.sections.forEach((section,index)=>{if(!section.table)return;const name=`Данные_${String(index+1).padStart(2,'0')}.csv`;csvNames.push(name);files[dir+'Данные/'+name]=strToU8(csv([section.table.columns,...section.table.rows].map(row=>row.map(cell=>typeof cell==='string'?text(cell):cell))));});
 csvNames.push('Условия_варианта.csv');
 files[dir+'Данные/Условия_варианта.csv']=strToU8(csv([['Вариант','Область','Система','Условие','Значение','Пример'],...profile.characteristics.map(item=>[area.code,area.title,area.systemCode,item.name,item.value,item.example.replaceAll('{system}',area.title)])]));
 const doc=new DOMParser().parseFromString(renderPage(lab),'text/html');
 const body=doc.createElement('main');
 const title=doc.createElement('h1');title.textContent=`ЛР ${lab.slug}. ${lab.title}`;body.append(title);
 const variant=doc.createElement('p');variant.textContent=`Вариант ${area.code}: ${area.title}`;variant.className='offline-variant';body.append(variant);
 const start=doc.createElement('section');start.innerHTML='<h2>Начните здесь</h2><ol><li>Распакуйте архив целиком.</li><li>Откройте файл <strong>Шаблон_для_заполнения.docx</strong> в этой папке через Word или другой редактор DOCX.</li><li>Заполните ФИО, группу и вариант. Выполните шаги ниже.</li></ol>';start.className='offline-start';body.append(start);
 const dataHelp=doc.createElement('p');dataHelp.textContent=`В папке «Данные» находятся CSV для работы в Excel или другом табличном редакторе: ${csvNames.join(', ')}. Если текст отображается неверно или всё попало в один столбец, импортируйте файл с кодировкой UTF-8 и разделителем «точка с запятой». Те же таблицы и условия показаны ниже в задании.`;start.append(dataHelp);
 const prerequisite=doc.createElement('p');prerequisite.textContent=labMethodology[lab.number].sequence.previous;body.append(prerequisite);
 for(const id of ['situation','profile','inputs','theory','example','task','self-check','lms-submit']){
 const section=doc.getElementById(id);if(!section)throw Error(`В архиве отсутствует обязательный раздел: ${id}`);
 section.querySelectorAll('button,a,.variant-source-note,.submission-actions,.eyebrow,.section-icon').forEach(el=>el.remove());
 const walker=doc.createTreeWalker(section,NodeFilter.SHOW_TEXT);let node:Node|null;while((node=walker.nextNode()))node.textContent=node.textContent?.replaceAll('в разделе «Данные и пример»','в этом задании')||'';
 body.append(section);
 }
 body.querySelectorAll('a,button,script,link,img,svg').forEach(el=>el.remove());
 const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ЛР ${lab.slug} · ${area.code}</title><style>@font-face{font-family:Raleway;src:url(data:font/woff2;base64,${embeddedFont}) format('woff2');font-display:swap}${offlineCss}</style></head><body>${body.outerHTML}</body></html>`;
 files[dir+'Начните_здесь.html']=strToU8(html);
 // Editable subject data is included as CSV; service files remain excluded.
 }

 return files
}
type BundleInput=Parameters<typeof buildFiles>[0]
function saveZip(files:Record<string,Uint8Array>,name:string){const zip=zipSync(files,{level:6});const href=URL.createObjectURL(new Blob([zip],{type:'application/zip'}));const a=document.createElement('a');a.href=href;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(href),10000)}
export async function downloadBundle(input:BundleInput){const {area,labs}=input;saveZip(await buildFiles(input),`${area.code}_${labs.length===1?'ЛР'+labs[0].slug:new Set(labs.map(l=>l.semester)).size===1?'семестр_'+labs[0].semester:'все_работы'}.zip`)}
export async function downloadAllVariants(inputs:BundleInput[]){
 if(!inputs.length)throw Error('Нет вариантов')
 const files:Record<string,Uint8Array>={}
 for(const input of inputs){const variantFiles=await buildFiles(input);for(const [path,bytes] of Object.entries(variantFiles)){files[`${input.area.code}/${input.labs.length===1?'ЛР'+input.labs[0].slug+'/':''}${path}`]=bytes}}
 const labs=inputs[0].labs
 files['Состав_комплекта.md']=strToU8(`# Комплект преподавателя — все варианты\n\n${inputs.map(i=>`- ${i.area.code}: ${i.area.title}`).join('\n')}\n\n${labs.map(l=>`- ЛР ${l.slug} (${l.semester} семестр)`).join('\n')}\n\nРаспакуйте архив полностью. В каждой папке работы откройте Начните_здесь.html и Шаблон_для_заполнения.docx.\n`)
 files['manifest.json']=strToU8(JSON.stringify({schemaVersion:1,scope:'all-variants',variants:inputs.map(i=>i.area.code),labs:labs.map(l=>({id:l.slug,semester:l.semester})),files:Object.keys(files)},null,2))
 saveZip(files,`Все_варианты_${new Set(labs.map(l=>l.semester)).size===1?'семестр_'+labs[0].semester:'все_семестры'}.zip`)
}
