// Server-side vector generator. No browser dependence. Export credits are enforced in server.js.
export function clamp(v,a,b){v=Number(v);return Number.isFinite(v)?Math.max(a,Math.min(b,v)):a}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function rnd(seed){let x=(seed|0)||123456;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}}
const safeColor=(s,d)=>/^#[0-9a-fA-F]{6}$/.test(s||'')?s:d;
export function normalized(p={}){
return {text:String(p.text??'VKTN').slice(0,80).replace(/[\x00-\x1f]/g,' '),mode:['grid','halftone-dots','halftone-lines','flow','distress','spray'].includes(p.mode)?p.mode:'grid',font:['Arial Black','Impact','Georgia','Courier New','Arial','Times New Roman'].includes(p.font)?p.font:'Arial Black',width:clamp(p.width||600,300,2400),height:clamp(p.height||900,300,2400),size:clamp(p.size??340,40,1100),grid:clamp(p.grid??90,16,220),shift:clamp(p.shift??33,-130,130),intensity:clamp(p.intensity??38,0,100),density:clamp(p.density??24,5,100),angle:clamp(p.angle??28,-90,90),phase:clamp(p.phase??0,-100,100),seed:clamp(p.seed??420,1,999999),ink:safeColor(p.ink,'#161616'),paper:safeColor(p.paper,'#f1f0ec'),transparent:!!p.transparent};
}
export function createSvg(raw={}, {watermark=false}={}){
const p=normalized(raw),{width:W,height:H}=p;let r=rnd(p.seed),out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`];
if(!p.transparent)out.push(`<rect width="100%" height="100%" fill="${p.paper}"/>`);
const font=esc(p.font),txt=esc(p.text||'A'),ink=p.ink;
const body=`<text x="${W/2}" y="${H/2}" font-size="${p.size}" font-family="${font}" font-weight="900" fill="${ink}" text-anchor="middle" dominant-baseline="central" textLength="${Math.max(130,W*.85)}" lengthAdjust="spacingAndGlyphs">${txt}</text>`;
out.push(`<defs><clipPath id="typeClip">${body.replace(/ fill="#[A-Fa-f0-9]+"/,' fill="white"')}</clipPath></defs>`);
if(p.mode==='grid'){
 let g=p.grid,n=0;out.push('<defs>');for(let y=0;y<H;y+=g)for(let x=0;x<W;x+=g){out.push(`<clipPath id="tile${n++}"><rect x="${x}" y="${y}" width="${g}" height="${g}"/></clipPath>`)}out.push('</defs>');n=0;
 for(let y=0;y<H;y+=g)for(let x=0;x<W;x+=g){let jx=Math.sin(x*.014+y*.027+p.phase*.09)*p.intensity*.43, jy=Math.cos(y*.012+x*.023+p.phase*.08)*p.intensity*.33;out.push(`<g clip-path="url(#tile${n++})" transform="translate(${(jx+(x-W/2)*p.shift/100).toFixed(2)} ${(jy+(y-H/2)*p.shift/100).toFixed(2)})">${body}</g>`)}
}else if(p.mode==='halftone-dots'){
 out.push('<g clip-path="url(#typeClip)" fill="'+ink+'">');let step=Math.max(5,110/p.density*7);for(let y=0;y<H+step;y+=step)for(let x=0;x<W+step;x+=step){let factor=.5+.5*Math.sin(x*.007+y*.014+p.phase*.09),radius=step*(.13+.34*factor*p.intensity/100);out.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius.toFixed(2)}"/>`)}out.push('</g>');
}else if(p.mode==='halftone-lines'){
 out.push(`<g clip-path="url(#typeClip)" stroke="${ink}" stroke-width="${Math.max(1,7*p.intensity/50).toFixed(2)}" fill="none" transform="rotate(${p.angle} ${W/2} ${H/2})">`);let gap=Math.max(3,120/p.density*4);for(let y=-H;y<H*2;y+=gap){let d=`M -${W} ${y}`;for(let x=-W;x<=W*2;x+=25)d+=` L ${x} ${(y+Math.sin(x*.019+p.phase*.08+y*.004)*p.intensity*.6).toFixed(2)}`;out.push(`<path d="${d}"/>`)}out.push('</g>');
}else if(p.mode==='flow'){
 out.push('<defs>');let g=Math.max(16,p.grid);let i=0;for(let y=0;y<H;y+=g)for(let x=0;x<W;x+=g)out.push(`<clipPath id="s${i++}"><rect x="${x}" y="${y}" width="${g}" height="${g}"/></clipPath>`);out.push('</defs>');i=0;for(let y=0;y<H;y+=g)for(let x=0;x<W;x+=g){let dx=Math.sin(y*.018+x*.006+p.phase*.15)*p.intensity*2,dy=Math.cos(x*.02+y*.008+p.phase*.1)*p.intensity*.65;out.push(`<g clip-path="url(#s${i++})" transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)})">${body}</g>`)}
}else if(p.mode==='distress'){
 out.push('<defs><mask id="damage"><rect width="100%" height="100%" fill="white"/>');for(let i=0;i<p.intensity*24;i++){let x=r()*W,y=r()*H,rr=(.35+r()*5)*p.intensity/50;out.push(`<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rr.toFixed(1)}" ry="${(rr*(.35+r()*2)).toFixed(1)}" transform="rotate(${Math.floor(r()*180)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="black"/>`)}out.push('</mask></defs><g mask="url(#damage)">',body,'</g>');
}else if(p.mode==='spray'){
 out.push(body,`<g fill="${ink}" clip-path="url(#typeClip)" opacity=".68">`);for(let i=0;i<p.intensity*35;i++){let x=r()*W,y=r()*H,rr=.15+Math.pow(r(),3)*p.density/6;out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(2)}"/>`)}out.push('</g>');
 out.push(`<g fill="${ink}" opacity=".58">`);for(let i=0;i<p.intensity*14;i++){let x=r()*W,y=r()*H,rr=.15+Math.pow(r(),5)*p.density/9;out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(2)}"/>`)}out.push('</g>');
}
if(watermark){out.push(`<g opacity=".65" transform="rotate(-22 ${W/2} ${H/2})">`);for(let y=-H;y<H*2;y+=115)out.push(`<text x="${-W}" y="${y}" font-family="Arial,sans-serif" font-size="25" letter-spacing="8" fill="${p.paper==='#161616'?'white':'#777'}">VKTN · PREVIEW · VKTN · PREVIEW · VKTN</text>`);out.push('</g>')}
out.push('</svg>');return out.join('')}
