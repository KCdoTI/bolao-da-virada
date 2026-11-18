import { writeFileSync } from 'node:fs';
import { conferirJogo, calcularRateio } from '../../src/utils/lotteryEngine';
import { parseCaixaTicketText } from '../../src/utils/lotteryOcrParser';
import { generateCanonicalManifest, calculateSha256 } from '../../src/utils/transparency';
import { fetchMegaSenaDraw } from '../../src/services/caixaLotteryService';
import handler from '../../api/bolao';

// Dados exclusivamente sintéticos. Nenhuma chamada à rede ou à produção.
const out: Record<string, unknown> = {};
const game = (dezenas:number[]) => ({ id:'audit-game', bolao_id:'audit', dezenas, criado_em:'2026-11-13' });
let scenarios=0, comparisons=0;
const mismatches: unknown[]=[];
for (const [mod,s,max,universe,keys] of [
  ['Mega-Sena',6,20,60,{6:'senas',5:'quinas',4:'quadras'}],
  ['Quina',5,15,80,{5:'quinas',4:'quadras',3:'ternos',2:'duques'}],
  ['Lotofácil',15,20,25,{15:'pontos15',14:'pontos14',13:'pontos13',12:'pontos12',11:'pontos11'}],
  ['Dupla Sena',6,15,50,{6:'senas',5:'quinas',4:'quadras',3:'ternos'}],
] as const) {
  for(let n=s;n<=max;n++) for(let m=Math.max(0,n+s-universe);m<=s;m++) {
    const counts:Record<number,number>={};
    // Enumeração independente de todos os subconjuntos, sem repetir a fórmula auditada.
    function visit(start:number,left:number,hits:number) {
      if(left===0){counts[hits]=(counts[hits]||0)+1;return;}
      for(let i=start;i<=n-left;i++)visit(i+1,left-1,hits+(i<m?1:0));
    }
    visit(0,s,0);
    const drawn=[...Array.from({length:m},(_,i)=>i+1),...Array.from({length:s-m},(_,i)=>n+i+1)];
    const result=conferirJogo(game(Array.from({length:n},(_,i)=>i+1)),drawn,{},mod).premiacaoCalculada;
    for(const [k,key] of Object.entries(keys)) {comparisons++;if(result[key as keyof typeof result] !== (counts[Number(k)]||0))mismatches.push({mod,n,m,k});}
    scenarios++;
  }
}
out.combinatoria={scenarios,comparisons,mismatches};
out.lotofacilFixos=[11,12,13].map(hits=>({hits,expected:[7,14,35][hits-11],actual:conferirJogo(game(Array.from({length:15},(_,i)=>i+1)),[...Array.from({length:hits},(_,i)=>i+1),...Array.from({length:15-hits},(_,i)=>16+i)],{},'Lotofácil').premiacaoCalculada.valorTotal}));
out.ocrSomenteMetadados=parseCaixaTicketText('CONCURSO 2810\nDATA 19/11/2026 14:22:10\nVALOR R$ 6,00');
out.ocrLotofacilComData=parseCaixaTicketText('LOTOFACIL\nDATA 19/11/2026 14:22:10\n01 03 05 07 09\n11 13 15 17 19\n21 22 23 24 25\nVALOR R$ 3,50','Lotofácil');
out.duplicadas=conferirJogo(game([1,1,1,1,1,1]),[1,2,3,4,5,6],{sena:100});
const paid=[1,2,3].map(id=>({id:String(id),bolao_id:'audit',nome:'Pessoa '+id,telefone:'',qtd_cotas:1,status_pagamento:'Pago' as const}));
const payout=calcularRateio(paid,100);
out.arredondamento={values:payout.map(p=>p.valorAReceber.toFixed(2)),displayedSum:payout.reduce((sum,p)=>sum+Math.round(p.valorAReceber*100),0)/100,expected:100};
const bolao={id:'audit',nome:'Teste',modalidade:'Mega-Sena',concurso_numero:123,valor_cota:12,data_limite:'2026-11-12T18:00:00-03:00',chave_pix_organizador:'audit@example.invalid',status:'aberto' as const,hash_slug:'audit'};
out.hashNaoIncluiFoto=generateCanonicalManifest(bolao,paid,[{...game([1,2,3,4,5,6]),foto_url:'foto-A'}])===generateCanonicalManifest(bolao,paid,[{...game([1,2,3,4,5,6]),foto_url:'foto-B'}]);
const savedFetch=globalThis.fetch;
try {
  globalThis.fetch=async()=>new Response('',{status:503});
  out.fallbackIndisponivel=await fetchMegaSenaDraw(999999);
  globalThis.fetch=async()=>new Response(JSON.stringify({numero:123,listaDezenas:['01','02','03','04','05','06'],listaRateioPremio:[{faixa:1,valorPremio:0},{faixa:2,valorPremio:25},{faixa:3,valorPremio:5}]}),{status:200});
  out.apiPremioZero=await fetchMegaSenaDraw(123);
} finally {globalThis.fetch=savedFetch;}
const request=async(method:string,query:any,body?:any)=>{let status=0,data:any;const res={setHeader(){},status(n:number){status=n;return this;},json(d:any){data=d;return this;},end(){}};await handler({method,query,body},res);return{status,data};};
out.apiSemAutenticacao={post:await request('POST',{}, {bolao:{...bolao,admin_token:'synthetic-admin'},participantes:paid}),get:await request('GET',{id:'audit'})};
const cryptoDescriptor=Object.getOwnPropertyDescriptor(globalThis,'crypto');
try {Object.defineProperty(globalThis,'crypto',{value:undefined,configurable:true});const hash=await calculateSha256('abc');out.hashSemWebCrypto={hash,isSha256:hash==='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'};} finally {if(cryptoDescriptor)Object.defineProperty(globalThis,'crypto',cryptoDescriptor);}
writeFileSync(new URL('./diagnosticos.json',import.meta.url),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
