// app.js (ES5-compatible)
(function(){
  function toYYYYMMDD(d){ return d ? d.replace(/-/g,'') : ''; }
  function isNum(n){ return n!==null && n!==undefined && !isNaN(Number(n)); }
  function fmt(n, digits){ if(!isNum(n)) return '—'; return Number(n).toFixed(digits||1); }
  function hhmm(iso){ return (iso && iso.length>=16) ? iso.slice(11,16) : ''; }

  function pick(/*...args*/){
    for(var i=0;i<arguments.length;i++){
      var v = arguments[i];
      if(isNum(v)) return v;
    }
    return null;
  }

  function parseWUResponse(json){
    var arr = [];
    if (json && json.observations && Object.prototype.toString.call(json.observations)==='[object Array]') {
      arr = json.observations;
    } else if (Object.prototype.toString.call(json)==='[object Array]') {
      arr = json;
    }
    return arr.map(function(o){
      var m = o && o.metric ? o.metric : o || {};
      var tLocal = o && (o.obsTimeLocal || o.obsTimeUtc) || (o && o.epoch ? new Date(o.epoch*1000).toISOString() : '');
      return {
        timeLocal: tLocal,
        precip:  pick(m && m.precipRate, m && m.precipTotal, m && m.precip),
        wind:    pick(m && m.windSpeedAvg, m && m.windspeedavg, m && m.windSpeedHigh, m && m.windgust),
        temp:    pick(m && m.tempAvg, m && m.temp, m && m.tempHigh, m && m.tempLow)
      };
    });
  }

  function loadData(){
    var status = document.getElementById('status');
    var stationEl = document.getElementById('station') || document.getElementById('stationId');
    var dateEl = document.getElementById('date');
    if(!stationEl || !dateEl){ alert('Falta #station o #date en el HTML'); return; }
    var stationId = (stationEl.value||'').trim();
    var dateISO = dateEl.value;
    var date = toYYYYMMDD(dateISO);
    if(!stationId || !date){ if(status) status.textContent='Completa estación y fecha.'; return; }
    if(status) status.textContent='Cargando…';

    try{
      var url = location.origin + '/api/wu/history?stationId=' + encodeURIComponent(stationId) + '&date=' + encodeURIComponent(date);
      fetch(url).then(function(res){
        return res.text().then(function(text){ return {res:res, text:text}; });
      }).then(function(pair){
        var res = pair.res, text = pair.text, json;
        try { json = JSON.parse(text); } catch(e) { json = { error: text }; }

        if(!res.ok){ if(status) status.textContent = 'Error: ' + (json && json.error ? json.error : res.statusText); return; }

        var rows = parseWUResponse(json);
        var tbody = document.querySelector('#dataTable tbody');
        if(!tbody){ alert('No encuentro #dataTable tbody'); return; }

        tbody.innerHTML = '';
        var minT=Infinity, maxT=-Infinity;
        rows.forEach(function(r){
          if(isNum(r.temp)){ minT = Math.min(minT, Number(r.temp)); maxT = Math.max(maxT, Number(r.temp)); }
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>'+hhmm(r.timeLocal)+'</td><td>'+fmt(r.precip,1)+'</td><td>'+fmt(r.wind,1)+'</td><td>'+fmt(r.temp,1)+'</td>';
          tbody.appendChild(tr);
        });

        var kpiCount = document.getElementById('kpiCount');
        var kpiMin = document.getElementById('kpiMin');
        var kpiMax = document.getElementById('kpiMax');
        if(kpiCount) kpiCount.textContent = String(rows.length);
        if(kpiMin) kpiMin.textContent = (isFinite(minT) ? minT.toFixed(1)+' °C' : '—');
        if(kpiMax) kpiMax.textContent = (isFinite(maxT) ? maxT.toFixed(1)+' °C' : '—');
        if(status) status.textContent='OK';
      }).catch(function(err){
        console.error(err); if(status) status.textContent='Error al cargar datos';
      });
    }catch(e){ console.error(e); if(status) status.textContent='Error al cargar datos'; }
  }

  function toCSV(){
    var head=[], ths=document.querySelectorAll('#dataTable thead th');
    for(var i=0;i<ths.length;i++){ head.push((ths[i].textContent||'').trim()); }
    var lines=[head.join(',')];
    var trs=document.querySelectorAll('#dataTable tbody tr');
    for(var r=0;r<trs.length;r++){
      var tds=trs[r].children, row=[];
      for(var c=0;c<tds.length;c++){ row.push((tds[c].textContent||'').trim()); }
      lines.push(row.join(','));
    }
    var blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'});
    var a=document.createElement('a');
    var today=new Date().toISOString().slice(0,10);
    a.href=URL.createObjectURL(blob); a.download='historico_'+today+'.csv'; a.click(); URL.revokeObjectURL(a.href);
  }

  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('loadBtn');
    var csv = document.getElementById('csvBtn');
    if(btn) btn.addEventListener('click', loadData);
    if(csv) csv.addEventListener('click', toCSV);

    var dEl = document.getElementById('date');
    if(dEl && !dEl.value){
      var d=new Date(), yyyy=d.getFullYear(), mm=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2);
      dEl.value = yyyy+'-'+mm+'-'+dd;
    }
  });
})();
