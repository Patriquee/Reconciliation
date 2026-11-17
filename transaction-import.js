(function(root){
function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');
  const rows=[];let row=[],field='',quoted=false,closed=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;continue;}
    if(c==='"'){if(field||closed)throw Error('Unexpected quote in CSV.');quoted=true;}
    else if(c===','){row.push(field);field='';closed=false;}
    else if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';closed=false;}
    else{if(closed)throw Error('Unexpected text after a quoted field.');field+=c;}
  }
  if(quoted)throw Error('Unclosed quoted field in CSV.');
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
function prepare(text,existing){
  const matrix=parseCSV(text);if(!matrix.length)throw Error('The CSV is empty.');
  const headers=matrix.shift().map(s=>s.trim().toLowerCase());
  const required=['transaction_id','created_at','type','status','rail','currency','amount'];
  const missing=required.filter(k=>!headers.includes(k));
  if(missing.length)throw Error('Missing columns: '+missing.join(', '));
  if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV column names.');
  const known=new Map(existing.map(r=>[r.transaction_id,r]));
  const result={rows:[],total:matrix.length,excluded:0,duplicates:0,invalid:0,errors:[],conflicts:0};
  for(let i=0;i<matrix.length;i++){
    const cells=matrix[i];
    const bad=message=>{result.invalid++;if(result.errors.length<5)result.errors.push('Record '+(i+2)+': '+message);};
    if(cells.length!==headers.length){bad('column count does not match header');continue;}
    const raw=Object.fromEntries(headers.map((h,j)=>[h,cells[j].trim()]));
    if(raw.status.toLowerCase()!=='completed'||!['daraja',''].includes(raw.rail.toLowerCase())||raw.currency.toUpperCase()!=='KES'||!['deposit','withdrawal'].includes(raw.type.toLowerCase())){result.excluded++;continue;}
    if(!raw.transaction_id||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/i.test(raw.created_at)||!Number.isFinite(Date.parse(raw.created_at))){bad('missing ID or invalid timestamp with timezone');continue;}
    if(!/^\d+(?:\.\d{1,2})?$/.test(raw.amount)||!Number.isSafeInteger(Math.round(Number(raw.amount)*100))||Number(raw.amount)<=0){bad('amount must be positive with at most two decimal places');continue;}
    const r={rail:raw.rail.toLowerCase(),transaction_id:raw.transaction_id,created_at:new Date(raw.created_at).toISOString(),type:raw.type.toLowerCase(),amount:Number(raw.amount).toFixed(2),counterparty_reference:raw.counterparty_reference||'',user_name:raw.user_name||'',user_phone:raw.user_phone||''};
    const old=known.get(r.transaction_id);
    if(old){if(old.type!==r.type||Math.round(Number(old.amount)*100)!==Math.round(Number(r.amount)*100)||Date.parse(old.created_at)!==Date.parse(r.created_at)){result.conflicts++;if(result.errors.length<5)result.errors.push('Conflicting transaction ID: '+r.transaction_id);}else result.duplicates++;continue;}
    known.set(r.transaction_id,r);result.rows.push(r);
  }
  return result;
}
root.TransactionImport={parseCSV,prepare};
})(typeof window==='undefined'?globalThis:window);
