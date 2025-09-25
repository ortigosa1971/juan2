(function(){
  function toYYYYMMDD(d){ return d ? d.replace(/-/g,'') : ''; }
  function isNum(n){ return n!==null && n!==undefined && !isNaN(Number(n)); }
  function fmt(n, digits){ if(!isNum(n)) return '—'; return Number(n).toFixed(digits||1); }
  function pick(){ for(var i=0;i<arguments.length;i++){ var v=arguments[i]; if(isNum(v)) return v; } return null; }
  function parseWUResponse(json){
    var arr=[];
    if (json && json.observations && Array.isArray(json.observations)) arr=json.observations;
    else if (Array.isArray(json)) arr=json;
    return arr.map(function(o){
      var m = o && o.metric ? o.metric : (o || {});
      var tLocal = (o && (o.obsTimeLocal || o.obsTimeUtc)) || (o && o.epoch ? new Date(o.epoch*1000).toISOString() : '');
      return { timeLocal:tLocal, precip:pick(m.precipRate,m.precipTotal,m.precip), wind:pick(m.windSpeedAvg,m.windspeedavg,m.windSpeedHigh,m.windgust), temp:pick(m.tempAvg,m.temp,m.tempHigh,m.tempLow)};
    });
  }
  async function loadData(){
    var status=document.getElementById('status');
    var stationEl=document.getElementById('station')||document.getElementById('stationId');
    var dateEl=document.getElementById('date'); var endEl=document.getElementById('endDate');
    if(!stationEl||!dateEl){ alert('Falta #station/#stationId o #date'); return; }
    var stationId=(stationEl.value||'').trim(); var startISO=dateEl.value; var endISO=(endEl&&endEl.value)?endEl.value:startISO;
    if(!stationId||!startISO){ if(status) status.textContent='Completa estación y fecha.'; return; }
    if(endISO<startISO){ var t=startISO; startISO=endISO; endISO=t; }
    var tbody=document.querySelector('#dataTable tbody'); tbody.innerHTML=''; var minT=Infinity,maxT=-Infinity,totalRows=0,dayCount=0;
    var toDate=s=>new Date(s+'T00:00:00'); var fmtDate=d=>d.toISOString().slice(0,10); var addDays=(d,n)=>{var x=new Date(d); x.setDate(x.getDate()+n); return x;};
    for(var d=toDate(startISO); d<=toDate(endISO); d=addDays(d,1)){
      var dayISO=fmtDate(d); var dateParam=toYYYYMMDD(dayISO); if(status) status.textContent='Cargando '+dayISO+'…';
      var url=location.origin+'/api/wu/history?stationId='+encodeURIComponent(stationId)+'&date='+encodeURIComponent(dateParam);
      try{ var res=await fetch(url); var text=await res.text(); var json; try{json=JSON.parse(text);}catch(e){json={error:text};}
        if(!res.ok){ var trErr=document.createElement('tr'); trErr.innerHTML='<td colspan=4>Error '+dayISO+'</td>'; tbody.appendChild(trErr); continue; }
        var rows=parseWUResponse(json); rows.forEach(function(r){ if(isNum(r.temp)){minT=Math.min(minT,Number(r.temp));maxT=Math.max(maxT,Number(r.temp));}
          var hora=(r.timeLocal&&r.timeLocal.length>=16)?(dayISO+' '+r.timeLocal.slice(11,16)):dayISO;
          var tr=document.createElement('tr'); tr.innerHTML='<td>'+hora+'</td><td>'+fmt(r.precip,1)+'</td><td>'+fmt(r.wind,1)+'</td><td>'+fmt(r.temp,1)+'</td>'; tbody.appendChild(tr); });
        totalRows+=rows.length; dayCount++;
      }catch(e){ var trCatch=document.createElement('tr'); trCatch.innerHTML='<td colspan=4>No se pudo cargar '+dayISO+'</td>'; tbody.appendChild(trCatch); }
    }
    if(document.getElementById('kpiCount')) document.getElementById('kpiCount').textContent=String(totalRows);
    if(document.getElementById('kpiMin')) document.getElementById('kpiMin').textContent=(isFinite(minT)?minT.toFixed(1)+' °C':'—');
    if(document.getElementById('kpiMax')) document.getElementById('kpiMax').textContent=(isFinite(maxT)?maxT.toFixed(1)+' °C':'—');
    if(status) status.textContent='Listo. Días cargados: '+dayCount+'.';
  }
  function toCSV(){ var head=[].map.call(document.querySelectorAll('#dataTable thead th'), th=>(th.textContent||'').trim()); var lines=[head.join(',')];
    var trs=document.querySelectorAll('#dataTable tbody tr'); for(var r=0;r<trs.length;r++){ var row=[],tds=trs[r].children; for(var c=0;c<tds.length;c++){ row.push((tds[c].textContent||'').trim()); } lines.push(row.join(',')); }
    var blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}); var a=document.createElement('a'); var today=new Date().toISOString().slice(0,10);
    a.href=URL.createObjectURL(blob); a.download='historico_'+today+'.csv'; a.click(); URL.revokeObjectURL(a.href); }
  function toXLSX(){ var table=document.getElementById('dataTable'); var today=new Date().toISOString().slice(0,10);
    if(window.XLSX&&XLSX.utils&&XLSX.writeFile){ try{ var wb=XLSX.utils.table_to_book(table,{sheet:'Datos'}); XLSX.writeFile(wb,'historico_'+today+'.xlsx'); return;}catch(e){console.error(e);} }
    var html='<html><head><meta charset="utf-8"></head><body>'+table.outerHTML+'</body></html>'; var blob=new Blob([html],{type:'application/vnd.ms-excel'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='historico_'+today+'.xls'; a.click(); URL.revokeObjectURL(a.href); }
  document.addEventListener('DOMContentLoaded',function(){ var btn=document.getElementById('loadBtn'); var csv=document.getElementById('csvBtn'); var xls=document.getElementById('xlsxBtn');
    if(btn) btn.addEventListener('click',loadData); if(csv) csv.addEventListener('click',toCSV); if(xls) xls.addEventListener('click',toXLSX);
    var dEl=document.getElementById('date'); if(dEl&&!dEl.value){ var d=new Date(),yyyy=d.getFullYear(),mm=('0'+(d.getMonth()+1)).slice(-2),dd=('0'+d.getDate()).slice(-2); dEl.value=yyyy+'-'+mm+'-'+dd; }
    var eEl=document.getElementById('endDate'); if(eEl&&!eEl.value&&dEl&&dEl.value){ eEl.value=dEl.value; } }); })();
