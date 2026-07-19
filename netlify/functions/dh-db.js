// netlify/functions/dh-db.js
// GitHub-backed database for Dark Hosting site
const GH_TOKEN = process.env.GITHUB_TOKEN;
const GH_REPO  = process.env.GITHUB_REPO;
const GH_FILE  = 'dh-db.json';
const GH_API   = `https://api.github.com/repos/${GH_REPO}/contents/${GH_FILE}`;
const GH_H     = { 'Authorization':`Bearer ${GH_TOKEN}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json' };

async function ghRead(){
  const r=await fetch(GH_API,{headers:GH_H});
  if(r.status===404) return {content:null,sha:null};
  if(!r.ok) throw new Error(`GH GET ${r.status}: ${await r.text()}`);
  const j=await r.json();
  return {content:JSON.parse(Buffer.from(j.content,'base64').toString('utf8')),sha:j.sha};
}
async function ghWrite(data,sha){
  const body={message:`dh sync ${new Date().toISOString()}`,content:Buffer.from(JSON.stringify(data)).toString('base64')};
  if(sha) body.sha=sha;
  const r=await fetch(GH_API,{method:'PUT',headers:GH_H,body:JSON.stringify(body)});
  if(!r.ok) throw new Error(`GH PUT ${r.status}: ${await r.text()}`);
}
const H={'Content-Type':'application/json','Access-Control-Allow-Origin':'*'};
exports.handler=async function(event){
  if(event.httpMethod==='OPTIONS') return{statusCode:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type'}};
  try{
    if(event.httpMethod==='GET'){
      const{content}=await ghRead();
      return{statusCode:200,headers:H,body:JSON.stringify(content)};
    }
    if(event.httpMethod==='PUT'){
      const data=JSON.parse(event.body);
      const{sha}=await ghRead();
      await ghWrite(data,sha);
      return{statusCode:200,headers:H,body:JSON.stringify({ok:true})};
    }
    return{statusCode:405,headers:H,body:JSON.stringify({error:'Method not allowed'})};
  }catch(e){
    console.error('dh-db error:',e);
    return{statusCode:500,headers:H,body:JSON.stringify({error:e.message})};
  }
};
  
