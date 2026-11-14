'use strict';
var lastAmount=null,lastMDR=0,lastGST=0,lastTotal=0,lastSplit=[],lastMaxPay=1999,lastSplitMDR=0;
document.getElementById('footer-year').textContent=new Date().getFullYear();

// Navigation and collapsible sections
function toggleMenu(b){var m=document.getElementById('mobile-menu');var o=m.classList.toggle('open');b.setAttribute('aria-expanded',o)}
function closeMobileMenu(){document.getElementById('mobile-menu').classList.remove('open');document.querySelector('.hamburger').setAttribute('aria-expanded','false')}
document.addEventListener('click',function(e){var m=document.getElementById('mobile-menu');var b=document.querySelector('.hamburger');if(m.classList.contains('open')&&!m.contains(e.target)&&!b.contains(e.target))closeMobileMenu()});
function toggleAccordion(t,id){var b=document.getElementById(id);var o=b.classList.toggle('open');t.setAttribute('aria-expanded',o)}

// Currency formatting and calculator inputs
function round2(n){return Math.round(n*100)/100}
function fmtINR(n){if(n===null||isNaN(n))return'—';return'₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}
function fmtINRWhole(n){if(n===null||isNaN(n))return'—';if(n===Math.floor(n))return'₹'+n.toLocaleString('en-IN');return'₹'+n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}

function setAmount(val){
  document.getElementById('payment-amount').value=val;clearError();
  document.querySelectorAll('.quick-select:not([aria-label*="split"]) .quick-btn').forEach(function(b){b.classList.remove('active')});
  document.querySelectorAll('.quick-select:not([aria-label*="split"]) .quick-btn').forEach(function(b){if(b.textContent.replace(/[^0-9]/g,'')===''+val)b.classList.add('active')});
  calculate();
}

function setSplitAmount(val){
  if(val>=2000)val=1999.99;
  document.getElementById('max-payment').value=val;clearSplitError();
  document.querySelectorAll('[aria-label*="split"] .quick-btn').forEach(function(b){b.classList.remove('active')});
  document.querySelectorAll('[aria-label*="split"] .quick-btn').forEach(function(b){if(b.textContent.replace(/[^0-9]/g,'')===''+val)b.classList.add('active')});
  if(document.getElementById('payment-amount').value.trim())calculate();
}

function showError(m){var e=document.getElementById('amount-error');var i=document.getElementById('payment-amount');e.textContent=m;e.classList.add('visible');i.classList.add('error');i.setAttribute('aria-invalid','true')}
function clearError(){var e=document.getElementById('amount-error');var i=document.getElementById('payment-amount');e.classList.remove('visible');i.classList.remove('error');i.removeAttribute('aria-invalid')}
function showSplitError(m){var e=document.getElementById('max-payment-error');var i=document.getElementById('max-payment');e.textContent=m;e.classList.add('visible');i.classList.add('error');i.setAttribute('aria-invalid','true')}
function clearSplitError(){var e=document.getElementById('max-payment-error');var i=document.getElementById('max-payment');e.classList.remove('visible');i.classList.remove('error');i.removeAttribute('aria-invalid')}

// ─── PAYMENT TYPE LOGIC ───────────────────────────────────────────
// MDR rules by payment type
var PAYMENT_TYPES = {
  p2m:     { label: 'Regular merchant (P2M)', mode: 'pct', rate: 0.004, cap: 300, threshold: 2000 },
  capital: { label: 'Capital market / Broking', mode: 'pct', rate: 0.0002, cap: 300, threshold: 2000,
             notice: '⚠ Capital market rate (0.02%) applies to SEBI-registered brokers, AMCs and DPs. Verify the exact charge with your acquiring bank or the latest NPCI circular NPCI/UPI/2026-27/044.' },
  special: { label: 'Special sector (Fuel/Rail/Telecom)', mode: 'flat', flatFee: 5, threshold: 2000,
             notice: '⚠ Special sector flat ₹5 MDR applies to fuel pumps, IRCTC/Railways, telecom, utility bills, insurance and agricultural inputs for transactions above ₹2,000. Verify with your acquiring bank or NPCI circular.' },
  small:   { label: 'Small merchant (≤ ₹1L/month)', mode: 'free', threshold: 2000,
             notice: '✓ Small merchants collecting ≤ ₹1 lakh/month via UPI QR codes (including PM SVANidhi and PM Vishwakarma beneficiaries) are 100% exempt from MDR.' },
  p2p:     { label: 'P2P transfer', mode: 'free', threshold: 999999,
             notice: '✓ Person-to-person (P2P) transfers are always free regardless of amount — no MDR at any value.' }
};

function onPaymentTypeChange() {
  var type = document.getElementById('payment-type').value;
  var cfg = PAYMENT_TYPES[type];
  var noticeEl = document.getElementById('payment-type-notice');
  if (cfg.notice) {
    noticeEl.textContent = cfg.notice;
    noticeEl.style.display = 'block';
    if (cfg.mode === 'free') {
      noticeEl.style.background = 'var(--green-light)';
      noticeEl.style.color = 'var(--green-deep)';
      noticeEl.style.border = '1px solid var(--green-border)';
    } else {
      noticeEl.style.background = 'var(--orange-light)';
      noticeEl.style.color = 'var(--orange-text)';
      noticeEl.style.border = '1px solid var(--orange-border)';
    }
  } else {
    noticeEl.style.display = 'none';
  }
  // Auto-recalculate if amount already entered
  if (document.getElementById('payment-amount').value.trim()) calculate();
}

function getPaymentConfig() {
  var type = document.getElementById('payment-type').value;
  return PAYMENT_TYPES[type] || PAYMENT_TYPES['p2m'];
}

// MDR calculations and split generation
function readSettings(){
  function setting(id, fallback, scale){var value=document.getElementById(id).valueAsNumber;return Number.isFinite(value)&&value>=0?value/scale:fallback}
  return{mdrRate:setting('mdr-rate',0.4,100),threshold:setting('mdr-threshold',2000,1),cap:setting('mdr-cap',300,1),gstRate:setting('gst-rate',18,100)}
}

function calcMDR(amount, s, cfg) {
  var gstRate = s ? s.gstRate : 0.18;
  var mdr = 0;
  if (!cfg) cfg = PAYMENT_TYPES['p2m'];
  if (cfg.mode === 'free') {
    mdr = 0;
  } else if (cfg.mode === 'flat') {
    mdr = amount > cfg.threshold ? cfg.flatFee : 0;
  } else {
    // pct mode — use cfg rates, ignore advanced settings for category-specific
    var isStandardMerchant = cfg === PAYMENT_TYPES.p2m;
    var rate = isStandardMerchant ? s.mdrRate : cfg.rate;
    var cap = isStandardMerchant ? s.cap : cfg.cap;
    var thresh = isStandardMerchant ? s.threshold : cfg.threshold;
    if (amount > thresh) mdr = Math.min(round2(amount * rate), cap);
  }
  var gst = round2(mdr * gstRate);
  return { mdr: mdr, gst: gst, total: round2(mdr + gst) };
}

function calcSplit(amount,maxPay){var p=[];var r=round2(amount);while(r>0){var v=round2(Math.min(r,maxPay));p.push(v);r=round2(r-v)}return p}

function calculate(){
  var raw=document.getElementById('payment-amount').value.trim();
  if(!raw){showError('Please enter the total payment amount.');hideResults();return}
  var amount=document.getElementById('payment-amount').valueAsNumber;
  if(!Number.isFinite(amount)||amount<0){showError('Please enter a valid amount.');hideResults();return}
  if(amount===0){showError('Amount must be greater than ₹0.');hideResults();return}
  clearError();

  var maxPayRaw=document.getElementById('max-payment').valueAsNumber;
  if(!Number.isFinite(maxPayRaw)||maxPayRaw<=0||maxPayRaw>=2000){showSplitError('Enter a value greater than zero and below 2,000.');hideResults();return}
  clearSplitError();
  var maxPay=maxPayRaw;

  var s=readSettings();
  var cfg=getPaymentConfig();
  var single=calcMDR(amount,s,cfg);
  if(Math.ceil(amount/maxPay)>10000){showError('Amount is too large to display as a split (maximum 10,000 payments).');hideResults();return}
  var payments=calcSplit(amount,maxPay);
  var totalSplitMDR=0;
  payments.forEach(function(p){totalSplitMDR=round2(totalSplitMDR+calcMDR(p,s,cfg).total)});

  // Update MDR label in single payment card to reflect current category
  var displayRate=cfg===PAYMENT_TYPES.p2m?s.mdrRate:cfg.rate;
  var mdrLabel = cfg.mode==='flat' ? 'MDR (flat ₹'+cfg.flatFee+')' : cfg.mode==='free' ? 'MDR (exempt)' : 'MDR ('+Math.round(displayRate*10000)/100+'%)';
  var mdrLabelEl = document.querySelector('#single-mdr').closest('.scenario-row').querySelector('.scenario-row-label');
  if(mdrLabelEl) mdrLabelEl.textContent = mdrLabel;

  lastAmount=amount;lastMDR=single.mdr;lastGST=single.gst;lastTotal=single.total;
  lastSplit=payments;lastMaxPay=maxPay;lastSplitMDR=totalSplitMDR;

  var resArea=document.getElementById('results-area');
  resArea.classList.remove('animate-in');
  void resArea.offsetWidth;
  resArea.classList.add('visible','animate-in');

  var belowEl=document.getElementById('below-threshold');
  var compareEl=document.getElementById('comparison-section');
  var splitEl=document.getElementById('split-breakdown');

  if(single.total > 0){
    belowEl.style.display='none';
    compareEl.style.display='block';
    document.getElementById('single-cost').textContent=fmtINR(single.total);
    document.getElementById('single-amount').textContent=fmtINRWhole(amount);
    document.getElementById('single-mdr').textContent=fmtINR(single.mdr);
    document.getElementById('single-gst').textContent=fmtINR(single.gst);
    document.getElementById('split-cost').textContent=fmtINR(totalSplitMDR);
    document.getElementById('split-total-val').textContent=fmtINRWhole(amount);
    document.getElementById('split-count-val').textContent=payments.length;
    document.getElementById('split-each-mdr').textContent=totalSplitMDR===0?'₹0 (below threshold)':fmtINR(totalSplitMDR);
    var diff=round2(single.total-totalSplitMDR);
    if(diff>0){
      document.getElementById('savings-callout').style.display='block';
      document.getElementById('savings-amount').textContent=fmtINR(diff);
      document.getElementById('savings-sub').textContent='Each of the '+payments.length+' payments stays below ₹2,000 — within the free threshold';
    } else {
      document.getElementById('savings-callout').style.display='none';
    }
  } else {
    compareEl.style.display='none';
    belowEl.style.display='block';
    document.getElementById('bt-amount').textContent=fmtINRWhole(amount);
    var freeReason = '';
    if (cfg.mode === 'free') {
      freeReason = '✓ ' + cfg.label + ' — 100% exempt from MDR charges at any amount.';
    } else if (payments.length > 1) {
      freeReason = '✓ Amount ' + fmtINRWhole(amount) + ' is within the ₹2,000 zero-MDR threshold. Below is your split breakdown into ' + payments.length + ' payments.';
    } else {
      freeReason = '✓ Amount ' + fmtINRWhole(amount) + ' is already below your ₹' + maxPay + ' split limit and within the ₹2,000 threshold — no split needed!';
    }
    document.getElementById('bt-note').textContent=freeReason;
  }

  if(payments.length > 1){
    splitEl.style.display='block';
    renderSplitList(payments,amount,maxPay);
  } else {
    splitEl.style.display='none';
  }
  setTimeout(function(){
    var target=document.getElementById('results-area');
    if(target){
      var topPos=target.getBoundingClientRect().top+window.pageYOffset-20;
      window.scrollTo({top:Math.max(0,topPos),behavior:'smooth'});
    }
  },80);
}

// Results, reset, copy, and share actions
function renderSplitList(payments,amount,maxPay){
  document.getElementById('sr-total').textContent=fmtINRWhole(amount);
  document.getElementById('sr-max').textContent=fmtINRWhole(maxPay);
  document.getElementById('sr-count').textContent=payments.length;
  var list=document.getElementById('split-list');list.innerHTML='';
  payments.forEach(function(p,i){
    var isLast=i===payments.length-1&&payments.length>1&&p<maxPay;
    var d=document.createElement('div');d.className='split-item'+(isLast?' split-last':'');d.setAttribute('role','listitem');
    d.style.animationDelay=(Math.min(i,18)*0.035)+'s';
    d.innerHTML='<span class="split-num">'+String(i+1).padStart(2,'0')+'</span><span class="split-amount">'+fmtINRWhole(p)+'</span>';
    list.appendChild(d);
  });
  var verifyTotal=round2(payments.reduce(function(s,v){return s+v},0));
  var tr=document.createElement('div');tr.className='split-total-row';
  tr.innerHTML='<span>Total</span><span class="split-total-amount">'+fmtINRWhole(verifyTotal)+'</span>';
  list.appendChild(tr);
}

function resetCalculator(){
  document.getElementById('payment-amount').value='';document.getElementById('max-payment').value=1999;
  clearError();clearSplitError();hideResults();
  document.querySelectorAll('.quick-btn').forEach(function(b){b.classList.remove('active')});
  document.querySelectorAll('[aria-label*="split"] .quick-btn').forEach(function(b){if(b.textContent.replace(/[^0-9]/g,'')==='1999')b.classList.add('active')});
  lastAmount=null;lastMDR=0;lastGST=0;lastTotal=0;lastSplit=[];lastSplitMDR=0;
  document.getElementById('payment-amount').focus();
}

function hideResults(){document.getElementById('results-area').classList.remove('visible','animate-in');document.getElementById('below-threshold').style.display='none';document.getElementById('comparison-section').style.display='none';document.getElementById('split-breakdown').style.display='none'}

function buildCopyText(){
  if(!lastAmount)return'';
  var t='UPICalc — UPI Payment Splitter\n\n';
  t+='Total: '+fmtINRWhole(lastAmount)+'\n';
  t+='Maximum per payment: '+fmtINRWhole(lastMaxPay)+'\n\n';
  t+='Payment split:\n';
  lastSplit.forEach(function(p,i){t+=(i+1)+'. '+fmtINRWhole(p)+'\n'});
  t+='\nTotal payments: '+lastSplit.length+'\n';
  t+='Total: '+fmtINRWhole(round2(lastSplit.reduce(function(s,v){return s+v},0)))+'\n\n';
  t+='Without splitting:\n';
  t+='  MDR: '+fmtINR(lastMDR)+'\n  GST on MDR: '+fmtINR(lastGST)+'\n  Total cost: '+fmtINR(lastTotal)+'\n\n';
  t+='With splitting (each below ₹2,000):\n';
  t+='  Estimated cost: '+fmtINR(lastSplitMDR)+'\n';
  var diff=round2(lastTotal-lastSplitMDR);
  if(diff>0)t+='  Potential difference: '+fmtINR(diff)+'\n';
  t+='\nNote: Actual MDR treatment depends on applicable rules.\nCalculated by UPICalc';
  return t;
}

function showCopied(){var e=document.getElementById('copy-confirm');e.classList.add('visible');setTimeout(function(){e.classList.remove('visible')},2200)}
function copyResult(){var t=buildCopyText();if(!t)return;if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(showCopied).catch(function(){fallbackCopy(t)})}else{fallbackCopy(t)}}
function fallbackCopy(t){var a=document.createElement('textarea');a.value=t;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.focus();a.select();document.execCommand('copy');document.body.removeChild(a);showCopied()}
// Uses Web Share API where supported; falls back to clipboard copy
function shareResult(){var t=buildCopyText();if(!t)return;if(navigator.share){navigator.share({title:'UPICalc — Payment Split',text:t}).catch(function(){})}else{copyResult()}}

// Calculator input event handlers
document.getElementById('payment-amount').addEventListener('input',function(){clearError();document.querySelectorAll('.quick-select:not([aria-label*="split"]) .quick-btn').forEach(function(b){b.classList.remove('active')})});
document.getElementById('payment-amount').addEventListener('keydown',function(e){if(e.key==='Enter')calculate()});
document.getElementById('max-payment').addEventListener('keydown',function(e){if(e.key==='Enter')calculate()});
document.getElementById('max-payment').addEventListener('input',function(){
  var v=parseFloat(this.value);
  document.querySelectorAll('[aria-label*="split"] .quick-btn').forEach(function(b){b.classList.remove('active')});
  if(!isNaN(v)&&v>=2000){showSplitError('Choose an amount below 2,000 to stay under the threshold.')}else{clearSplitError()}
});
