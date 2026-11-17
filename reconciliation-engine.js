/* Reconciliation business rules. Amounts are integer KES cents.
 * Storage, file selection and DOM updates belong to the page, not this engine.
 */
(function(root){
  'use strict';
  function toCents(value){
    const text=String(value);
    if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw Error('Enter a non-negative amount with up to two decimal places.');
    const [whole,fraction='']=text.split('.');
    const cents=Number(whole)*100+Number(fraction.padEnd(2,'0'));
    if(!Number.isSafeInteger(cents))throw Error('Amount is too large.');
    return cents;
  }
  // All offset-free UI values are Nairobi/EAT, regardless of browser timezone.
  // Legacy date-only records keep their previous end-of-day semantics.
  function timestamp(value){
    if(typeof value!=='string')return NaN;
    if(/^\d{4}-\d{2}-\d{2}$/.test(value))value+='T23:59:59.999';
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(value))return NaN;
    const ms=Date.parse(value+'+03:00');
    if(!Number.isFinite(ms))return NaN;
    const roundtrip=new Date(ms+10800000).toISOString().slice(0,10);
    return roundtrip===value.slice(0,10)?ms:NaN;
  }
  function formatDateTime(value){return String(value).replace('T',' ')+' EAT';}
  function filterPeriod(transactions,period){
    if(!period)return [];
    const start=timestamp(period.openingDate),end=timestamp(period.ending);
    return transactions.filter(row=>{const time=Date.parse(row.created_at);return time>start&&time<=end;})
      .sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at));
  }
  function calculate(rows,state){
    let d=0,w=0,dc=0,wc=0;
    for(const row of rows){
      if(!state.cleared[row.transaction_id])continue;
      const amount=toCents(row.amount);
      if(row.type==='deposit'){d+=amount;dc++;}
      else if(row.type==='withdrawal'){w+=amount;wc++;}
    }
    const charges=state.chargesCents??0;
    if(!Number.isSafeInteger(charges)||charges<0)throw Error('Charges must be non-negative integer cents.');
    const cb=state.opening?state.opening.cents+d-w-charges:null;
    const diff=state.opening&&state.balance!==''?toCents(state.balance)-state.opening.cents-charges+d-w:null;
    return {rows,d,w,dc,wc,cb,diff,charges};
  }
  function validateRun(state,transactions){
    if(!state.opening)return {error:'Set and lock the verified first opening balance before running reconciliation.'};
    if(!Number.isFinite(timestamp(state.opening.date))||!Number.isSafeInteger(state.opening.cents)||state.opening.cents<0)return {error:'The opening balance or its date is invalid.'};
    if(!Number.isFinite(timestamp(state.ending))||timestamp(state.ending)<=timestamp(state.opening.date))return {error:'Statement ending date and time must follow the opening date and time.'};
    try{toCents(state.balance);}catch(error){return {error:'Enter the independent statement ending balance with up to two decimal places.'};}
    if(!transactions.length)return {error:'Import a platform transaction CSV first.'};
    const days=(timestamp(state.ending)-timestamp(state.opening.date))/86400000;
    const approved=state.periodApproval?.openingDate===state.opening.date&&state.periodApproval?.ending===state.ending&&Boolean(state.periodApproval.reference?.trim());
    return {period:{openingDate:state.opening.date,ending:state.ending},days,requiresLeadApproval:days>7&&!approved};
  }
  root.ReconciliationEngine=Object.freeze({toCents,timestamp,formatDateTime,filterPeriod,calculate,validateRun});
})(typeof window==='undefined'?globalThis:window);
