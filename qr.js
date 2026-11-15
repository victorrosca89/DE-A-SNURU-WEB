/* Generator QR minimal (mod octet, corecție M, versiunile 1–10). Fără dependențe, funcționează offline. */
(function(){
const ECC=[0,10,16,26,18,24,16,18,22,22,26], BLK=[0,1,1,1,2,2,4,4,4,5,5];
const mul=(a,b)=>{let r=0;for(let i=7;i>=0;i--){r=(r<<1)^((r>>>7)*0x11D);r^=((b>>>i)&1)*a}return r&255};
function rsDiv(d){const r=new Array(d).fill(0);r[d-1]=1;let root=1;for(let i=0;i<d;i++){for(let j=0;j<d;j++){r[j]=mul(r[j],root);if(j+1<d)r[j]^=r[j+1]}root=mul(root,2)}return r}
function rsRem(data,div){const r=div.map(()=>0);for(const b of data){const f=b^r.shift();r.push(0);div.forEach((c,i)=>r[i]^=mul(c,f))}return r}
const raw=v=>{let r=(16*v+128)*v+64;if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}return r};
const dataCw=v=>Math.floor(raw(v)/8)-ECC[v]*BLK[v];
function build(text){
 const bytes=Array.from(new TextEncoder().encode(text));let ver=1;
 for(;;ver++){if(ver>10)throw new Error('Text prea lung pentru QR');const cb=ver<10?8:16;if(4+cb+bytes.length*8<=dataCw(ver)*8)break}
 const bits=[],put=(v,n)=>{for(let i=n-1;i>=0;i--)bits.push((v>>>i)&1)};
 put(4,4);put(bytes.length,ver<10?8:16);bytes.forEach(b=>put(b,8));
 const cap=dataCw(ver)*8;put(0,Math.min(4,cap-bits.length));while(bits.length%8)bits.push(0);
 for(let p=0xEC;bits.length<cap;p^=0xEC^0x11)put(p,8);
 const data=[];for(let i=0;i<bits.length;i+=8){let b=0;for(let j=0;j<8;j++)b=(b<<1)|bits[i+j];data.push(b)}
 // blocuri + ECC
 const nb=BLK[ver],el=ECC[ver],rc=Math.floor(raw(ver)/8),ns=nb-rc%nb,sl=Math.floor(rc/nb),div=rsDiv(el),blocks=[];
 for(let i=0,k=0;i<nb;i++){const dat=data.slice(k,k+sl-el+(i<ns?0:1));k+=dat.length;const ecc=rsRem(dat,div);if(i<ns)dat.push(0);blocks.push(dat.concat(ecc))}
 const cw=[];for(let i=0;i<blocks[0].length;i++)blocks.forEach((b,j)=>{if(i!=sl-el||j>=ns)cw.push(b[i])});
 // matrice
 const N=ver*4+17,M=Array.from({length:N},()=>new Array(N).fill(false)),F=Array.from({length:N},()=>new Array(N).fill(false));
 const set=(x,y,d)=>{M[y][x]=d;F[y][x]=true};
 for(let i=0;i<N;i++){set(6,i,i%2==0);set(i,6,i%2==0)}
 const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;if(x>=0&&x<N&&y>=0&&y<N)set(x,y,d!=2&&d!=4)}};
 finder(3,3);finder(N-4,3);finder(3,N-4);
 if(ver>1){const n=Math.floor(ver/7)+2,st=ver==32?26:Math.ceil((ver*4+4)/(n*2-2))*2,pos=[6];for(let p=N-7;pos.length<n;p-=st)pos.splice(1,0,p);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){if((i==0&&j==0)||(i==0&&j==n-1)||(i==n-1&&j==0))continue;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(pos[i]+dx,pos[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!=1)}}
 const fmt=mask=>{const d=mask;let r=d;for(let i=0;i<10;i++)r=(r<<1)^((r>>>9)*0x537);const b=((d<<10)|r)^0x5412,g=i=>((b>>>i)&1)!=0;
  for(let i=0;i<=5;i++)set(8,i,g(i));set(8,7,g(6));set(8,8,g(7));set(7,8,g(8));for(let i=9;i<15;i++)set(14-i,8,g(i));
  for(let i=0;i<8;i++)set(N-1-i,8,g(i));for(let i=8;i<15;i++)set(8,N-15+i,g(i));set(8,N-8,true)};
 fmt(0);
 if(ver>=7){let r=ver;for(let i=0;i<12;i++)r=(r<<1)^((r>>>11)*0x1F25);const b=(ver<<12)|r;
  for(let i=0;i<18;i++){const g=((b>>>i)&1)!=0,a=N-11+i%3,c=Math.floor(i/3);set(a,c,g);set(c,a,g)}}
 // date în zigzag
 for(let i=0,right=N-1;right>=1;right-=2){if(right==6)right=5;
  for(let v=0;v<N;v++)for(let j=0;j<2;j++){const x=right-j,up=((right+1)&2)==0,y=up?N-1-v:v;
   if(!F[y][x]&&i<cw.length*8){M[y][x]=((cw[i>>>3]>>>(7-(i&7)))&1)!=0;i++}}}
 const MF=[(x,y)=>(x+y)%2==0,(x,y)=>y%2==0,(x,y)=>x%3==0,(x,y)=>(x+y)%3==0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2==0,(x,y)=>x*y%2+x*y%3==0,(x,y)=>(x*y%2+x*y%3)%2==0,(x,y)=>((x+y)%2+x*y%3)%2==0];
 const apply=m=>{for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(!F[y][x]&&MF[m](x,y))M[y][x]=!M[y][x]};
 function penalty(){let p=0,dark=0;
  const line=g=>{let run=1,s=0;for(let i=1;i<N;i++){if(g(i)==g(i-1))run++;else{if(run>=5)s+=3+run-5;run=1}}if(run>=5)s+=3+run-5;
   const a=[];for(let i=0;i<N;i++)a.push(g(i)?1:0);const t=a.join('');for(const pt of['10111010000','00001011101']){let k=-1;while((k=t.indexOf(pt,k+1))>=0)s+=40}return s};
  for(let y=0;y<N;y++)p+=line(i=>M[y][i]);for(let x=0;x<N;x++)p+=line(i=>M[i][x]);
  for(let y=0;y<N-1;y++)for(let x=0;x<N-1;x++)if(M[y][x]==M[y][x+1]&&M[y][x]==M[y+1][x]&&M[y][x]==M[y+1][x+1])p+=3;
  for(const r of M)for(const c of r)if(c)dark++;const tot=N*N;p+=(Math.ceil(Math.abs(dark*20-tot*10)/tot)-1)*10;return p}
 let best=0,bp=1e9;for(let m=0;m<8;m++){apply(m);fmt(m);const p=penalty();if(p<bp){bp=p;best=m}apply(m)}
 apply(best);fmt(best);return M}
function draw(canvas,text,px){const M=build(text),N=M.length,q=4,s=Math.max(2,Math.floor(px/(N+2*q))),W=(N+2*q)*s;
 canvas.width=canvas.height=W;const x=canvas.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,W);x.fillStyle='#000';
 for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(M[r][c])x.fillRect((c+q)*s,(r+q)*s,s,s)}
window.QR={matrix:build,draw};
if(typeof module!=='undefined')module.exports={matrix:build};
})();
