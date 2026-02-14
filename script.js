const totalSteps = 9; 
let currentStep = 1;
let schoolData = { tingkat: [], jurusan: {}, paralel: {}, split: {}, mapel: [], guru: [], batasan: [] };
let confirmCallback = null;

document.addEventListener("DOMContentLoaded", () => {
    const btnConfirmYes = document.getElementById('btnConfirmYes');
    if(btnConfirmYes) {
        btnConfirmYes.addEventListener('click', () => { 
            closeConfirmModal(); 
            if(confirmCallback) confirmCallback(); 
        });
    }
    renderIndicator();
    updateNavigationButtons(currentStep); 
});

function showAlert(msg, type='error') {
    const c = document.getElementById('toast-container');
    if(!c) return; 
    const t = document.createElement('div');
    let icon = type==='success' ? '✅' : (type==='warning' ? '⚠️' : '❌');
    t.className = `toast ${type}`; 
    t.innerHTML = `<span style="font-size: 1.2em;">${icon}</span> <span>${msg}</span>`;
    c.appendChild(t); 
    setTimeout(() => { 
        t.classList.add('fade-out'); 
        setTimeout(() => t.remove(), 400); 
    }, 3000);
}

function showConfirmModal(m, cb) { 
    document.getElementById('confirmMessage').innerText = m; 
    document.getElementById('customConfirmModal').classList.add('active'); 
    confirmCallback = cb; 
}

function closeConfirmModal() { 
    document.getElementById('customConfirmModal').classList.remove('active'); 
}

window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('btn-' + tabId).classList.add('active');
    document.getElementById(tabId).classList.add('active');
};

function saveDraft() { 
    try{ if(currentStep<5) validateCurrentStep(); }catch(e){} 
    localStorage.setItem('wizardData', JSON.stringify(schoolData)); 
    localStorage.setItem('wizardStep', currentStep); 
    showAlert("Data berhasil disave ke memori!", "success"); 
}

function loadDraft() {
    const d = localStorage.getItem('wizardData');
    if(d) {
        schoolData = JSON.parse(d);
        if(!schoolData.batasan) schoolData.batasan = [];
        repopulateUI();
        currentStep = parseInt(localStorage.getItem('wizardStep')) || 1; 
        showStep(currentStep); 
        showAlert("Data berhasil di-load!", "success");
    } else {
        showAlert("Tidak ada data tersimpan.", "warning");
    }
}

function downloadProgressFile() {
    try{ if(currentStep<5) validateCurrentStep(); }catch(e){}
    const dataStr = JSON.stringify({ step: currentStep, data: schoolData }, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Backup_Jadwal_${new Date().getTime()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showAlert("File Backup JSON berhasil diunduh.", "success");
}

function uploadProgressFile(event) {
    const file = event.target.files[0]; if(!file) return; 
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsed = JSON.parse(e.target.result);
            if(parsed.data && parsed.step) {
                schoolData = parsed.data; currentStep = parsed.step;
                if(!schoolData.batasan) schoolData.batasan = [];
                repopulateUI(); showStep(currentStep); 
                showAlert("File Backup berhasil dibaca!", "success");
            } else { 
                showAlert("Format file JSON tidak sesuai!", "error"); 
            }
        } catch(err) { 
            showAlert("Gagal memproses file JSON.", "error"); 
        }
    };
    reader.readAsText(file);
}

function repopulateUI() {
    if(schoolData.tingkat.length>0) { document.getElementById('inputTingkat').value = schoolData.tingkat.join(', '); prepareNextStepData(2); }
    for(let tk in schoolData.jurusan) if(document.getElementById(`jurusan_${tk}`)) document.getElementById(`jurusan_${tk}`).value = schoolData.jurusan[tk].join(', ');
    if(Object.keys(schoolData.jurusan).length>0) prepareNextStepData(3);
    for(let k in schoolData.paralel) if(document.getElementById(`paralel_${k}`)) document.getElementById(`paralel_${k}`).value = schoolData.paralel[k];
    if(Object.keys(schoolData.paralel).length>0) prepareNextStepData(4);
    for(let k in schoolData.split) if(document.getElementById(`split_pa_${k}`)) { document.getElementById(`split_pa_${k}`).value=schoolData.split[k].pa; document.getElementById(`split_pi_${k}`).value=schoolData.split[k].pi; }
    if(schoolData.mapel.length>0) renderTabelMapel();
    if(schoolData.guru.length>0) { renderTabelGuru(); prepareNextStepData(7); }
    if(schoolData.batasan && schoolData.batasan.length>0) renderBatasan();
}

function cleanDraft() { 
    showConfirmModal("Anda yakin ingin menghapus semua form dan tabel? Halaman akan di-refresh.", () => { 
        localStorage.clear(); location.reload(); 
    }); 
}

function renderIndicator() { 
    let h=''; 
    for(let i=1;i<=totalSteps;i++) h+=`<span class="step-pill ${i===currentStep?'active':(i<currentStep?'completed':'')}">STEP ${i}</span>`; 
    document.getElementById('stepIndicator').innerHTML=h; 
}

function updateNavigationButtons(step) {
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    
    btnPrev.style.display = 'flex';
    btnNext.style.display = 'flex';

    if(step === 1) {
        btnPrev.style.visibility = 'hidden'; 
    } else {
        btnPrev.style.visibility = 'visible';
    }

    if(step >= totalSteps) { 
        btnNext.style.visibility = 'hidden';
    } else {
        btnNext.style.visibility = 'visible';
    }
}

function showStep(s) { 
    document.querySelectorAll('.step-content').forEach(el=>el.classList.remove('active')); 
    document.getElementById(`step${s}`).classList.add('active'); 
    
    updateNavigationButtons(s);
    
    renderIndicator(); 
    document.querySelector('.container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function nextStep() { if(!validateCurrentStep()) return; prepareNextStepData(currentStep+1); currentStep++; showStep(currentStep); }
function prevStep() { currentStep--; showStep(currentStep); }

function validateCurrentStep() {
    if(currentStep===1){ const v=document.getElementById('inputTingkat').value.trim(); if(!v) return showAlert("Isi Tingkat Kelas!","error"),false; schoolData.tingkat=v.split(',').map(s=>s.trim()); }
    else if(currentStep===2){ schoolData.jurusan={}; for(let tk of schoolData.tingkat){ const v=document.getElementById(`jurusan_${tk}`).value.trim(); if(!v) return showAlert(`Jurusan ${tk} kosong!`,"error"),false; schoolData.jurusan[tk]=v.split(',').map(s=>s.trim()); } }
    else if(currentStep===3){ schoolData.paralel={}; for(let tk of schoolData.tingkat) for(let jur of schoolData.jurusan[tk]){ const k=`${tk}-${jur}`,v=document.getElementById(`paralel_${k}`).value; if(!v||v<1) return showAlert(`Paralel ${tk} ${jur} tidak valid!`,"error"),false; schoolData.paralel[k]=parseInt(v); } }
    else if(currentStep===4){ schoolData.split={}; for(let k in schoolData.paralel){ const t=schoolData.paralel[k], pa=parseInt(document.getElementById(`split_pa_${k}`).value)||0, pi=parseInt(document.getElementById(`split_pi_${k}`).value)||0; if(pa+pi!==t) return showAlert(`Total PA+PI di ${k} harus = ${t}!`,"error"),false; schoolData.split[k]={pa,pi}; } }
    else if(currentStep===5 && schoolData.mapel.length===0) return showAlert("Anda belum Import Matriks Mapel!","error"),false;
    else if(currentStep===6 && schoolData.guru.length===0) return showAlert("Anda belum Import Matriks Guru!","error"),false;
    return true;
}

function prepareNextStepData(ns) {
    if(ns===2){ let h=''; schoolData.tingkat.forEach(tk=>{ h+=`<div class="dynamic-row"><label>Rincian Kelas ${tk}:</label><input type="text" id="jurusan_${tk}" placeholder="Contoh: IPA, IPS atau Tidak Ada"></div>`; }); document.getElementById('formJurusanArea').innerHTML=h; }
    else if(ns===3){ let h=''; schoolData.tingkat.forEach(tk=>schoolData.jurusan[tk].forEach(jur=>{ const lbl=jur.toLowerCase()==='tidak ada'?tk:`${tk} ${jur}`; h+=`<div class="dynamic-row"><label>Jumlah Rombel ${lbl}:</label><input type="number" id="paralel_${tk}-${jur}" min="1"></div>`; })); document.getElementById('formParalelArea').innerHTML=h; }
    else if(ns===4){ let h=''; for(let k in schoolData.paralel){ const t=schoolData.paralel[k], lbl=k.replace('-Tidak Ada',''); h+=`<div class="dynamic-row"><label>${lbl} (Total: ${t}):</label> Jml PA:<input type="number" id="split_pa_${k}" min="0"> Jml PI:<input type="number" id="split_pi_${k}" min="0"></div>`; } document.getElementById('formSplitArea').innerHTML=h; }
    else if(ns===7){
        let opts = '<option value="">-- Pilih Guru Dulu --</option>';
        let sortedGuru = [...new Set(schoolData.guru.map(g=>g.nama))].sort();
        sortedGuru.forEach(g => { opts += `<option value="${g}">${g}</option>`; });
        document.getElementById('restrictGuru').innerHTML = opts;
        renderBatasan();
    }
}

window.tambahBatasan = function() {
    let guru = document.getElementById('restrictGuru').value;
    let hari = document.getElementById('restrictHari').value;
    let jamRaw = document.getElementById('restrictJam').value;
    
    if(!guru) { showAlert("Pilih nama guru terlebih dahulu!", "warning"); return; }
    
    let jamClean = "";
    if(jamRaw.trim() !== "") {
        let parts = jamRaw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if(parts.length === 0) {
            showAlert("Format Jam salah! Gunakan angka dipisah koma (contoh: 1, 2).", "error");
            return;
        }
        jamClean = parts.join(', ');
    }

    if(!schoolData.batasan) schoolData.batasan = [];
    schoolData.batasan.push({guru: guru, hari: hari, jam: jamClean});
    
    renderBatasan();
    showAlert("Batasan waktu ditambahkan.", "success");
    document.getElementById('restrictJam').value = ''; 
}

window.hapusBatasan = function(idx) {
    schoolData.batasan.splice(idx, 1);
    renderBatasan();
}

window.renderBatasan = function() {
    let tbody = document.getElementById('bodyBatasan');
    if(!schoolData.batasan || schoolData.batasan.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="color: #94a3b8; text-align:center;">Belum ada batasan waktu yang ditambahkan.</td></tr>';
        return;
    }
    let html = '';
    schoolData.batasan.forEach((b, idx) => {
        let infoJam = b.jam ? `Sesi / Jam Ke: <b style="color:var(--dark); background:#e2e8f0; padding:2px 6px; border-radius:4px;">${b.jam}</b>` : '<b style="color:var(--danger); background:#fee2e2; padding:2px 6px; border-radius:4px;">Izin Seharian</b>';
        html += `<tr>
            <td style="text-align:left; font-weight:700; color:var(--primary); padding-left:15px;">${b.guru}</td>
            <td style="text-align:center;">${b.hari}</td>
            <td style="text-align:center;">${infoJam}</td>
            <td style="text-align:center;"><button onclick="hapusBatasan(${idx})" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">Hapus 🗑️</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function isGuruRestricted(guruName, hariStr, sesi) {
    if(!schoolData.batasan) return false;
    for(let b of schoolData.batasan) {
        if(b.guru === guruName && hariStr.includes(b.hari)) {
            if(!b.jam) return true; 
            let jamArr = b.jam.split(',').map(s => parseInt(s.trim()));
            if(jamArr.includes(sesi)) return true;
        }
    }
    return false;
}

function downloadExcelCSV(content, name) { 
    const l=document.createElement("a"); 
    l.href=URL.createObjectURL(new Blob(["\uFEFF"+content], {type:'text/csv;charset=utf-8;'})); 
    l.download=name; document.body.appendChild(l); l.click(); l.remove(); 
}

function exportTemplateMapel() {
    const grps = Object.keys(schoolData.paralel).map(k=>k.replace('-Tidak Ada',''));
    downloadExcelCSV("Mata Pelajaran;" + grps.join(";") + "\n", "Template_Mapel.csv");
}

function importDataMapel(e) {
    const f = e.target.files[0]; if(!f) return; const r = new FileReader();
    r.onload = function(ev) {
        const rows = ev.target.result.split('\n'); if(rows.length<2) return;
        const delim = rows[0].includes(';')?';':',', rgx = new RegExp(delim+'(?=(?:(?:[^"]*"){2})*[^"]*$)');
        const hdr = rows[0].split(rgx).map(h=>h.replace(/"/g,'').trim()), cls = hdr.slice(1);
        schoolData.mapel=[];
        for(let i=1; i<rows.length; i++) {
            if(!rows[i].trim()) continue; const col = rows[i].split(rgx).map(c=>c.replace(/"/g,'').trim());
            if(col.length>=2 && col[0]!=="") {
                const mapelClean = col[0].trim(); 
                for(let j=1; j<col.length; j++) { 
                    let jp=parseInt(col[j])||0; 
                    if(jp>0 && cls[j-1]) schoolData.mapel.push({kelas:cls[j-1], mapel:mapelClean, jp}); 
                }
            }
        }
        renderTabelMapel(); showAlert("Data Matriks Mapel terbaca.", "success");
    }; r.readAsText(f);
}

function renderTabelMapel() {
    const uCls=[...new Set(schoolData.mapel.map(m=>m.kelas))], uMap=[...new Set(schoolData.mapel.map(m=>m.mapel))];
    let h=`<div style="overflow-x:auto;"><table class="table-preview table-mapel"><tr><th style="text-align:center;">Mata Pelajaran</th>${uCls.map(c=>`<th style="text-align:center;">${c}</th>`).join('')}</tr>`;
    uMap.forEach(m=>{ h+=`<tr><td>${m}</td>${uCls.map(c=>{ const d=schoolData.mapel.find(x=>x.mapel===m&&x.kelas===c); return `<td>${d?d.jp:'-'}</td>`; }).join('')}</tr>`; });
    document.getElementById('previewMapel').innerHTML = h+`</table></div>`;
}

function exportTemplateGuru() {
    const grps = Object.keys(schoolData.paralel).map(k=>k.replace('-Tidak Ada',''));
    downloadExcelCSV("Nama Guru;Mata Pelajaran;Target (PA/PI/Bebas);" + grps.join(";") + "\n", "Template_Guru.csv");
}

function importDataGuru(e) {
    const f = e.target.files[0]; if(!f) return; const r = new FileReader();
    r.onload = function(ev) {
        const rows = ev.target.result.split('\n'); if(rows.length<2) return;
        const delim = rows[0].includes(';')?';':',', rgx = new RegExp(delim+'(?=(?:(?:[^"]*"){2})*[^"]*$)');
        
        let hdr = rows[0].split(rgx).map(h=>h.replace(/"/g,'').trim());
        let hasTargetCol = hdr[2] && (hdr[2].toLowerCase().includes('target') || hdr[2].toLowerCase().includes('pa/pi') || hdr[2].toLowerCase().includes('gender'));
        let startIndex = hasTargetCol ? 3 : 2;
        let cls = hdr.slice(startIndex);
        
        schoolData.guru=[];
        
        for(let i=1; i<rows.length; i++) {
            if(!rows[i].trim()) continue; const col = rows[i].split(rgx).map(c=>c.replace(/"/g,'').trim());
            if(col.length >= 2 && col[0]!=="") { 
                const guruName = col[0].trim();
                const mapelRawArr = col[1].split(',').map(m => m.trim()).filter(m => m !== "");
                const mapelCleanStr = mapelRawArr.join(', ');
                
                let targetGender = 'BEBAS';
                if(hasTargetCol && col[2]) {
                    let t = col[2].trim().toUpperCase();
                    if(t === 'PA' || t === 'PI') targetGender = t;
                }
                
                let tot=0, rin={};
                for(let j=startIndex; j<col.length; j++) { 
                    let jp=parseInt(col[j])||0; 
                    if(cls[j-startIndex]) { rin[cls[j-startIndex]] = jp; tot+=jp; } 
                }
                
                schoolData.guru.push({
                    nama:guruName, 
                    mapelsArr:mapelRawArr, 
                    mapels:mapelCleanStr, 
                    target: targetGender,
                    rincian:rin, 
                    total:tot
                });
            }
        }
        renderTabelGuru(); showAlert("Data Guru berhasil dimuat.", "success");
    }; r.readAsText(f);
}

window.updateJPGuru = function(guruIdx, kelas, value) {
    let val = parseInt(value) || 0;
    schoolData.guru[guruIdx].rincian[kelas] = val;
    
    let tot = 0;
    for(let k in schoolData.guru[guruIdx].rincian) {
        tot += schoolData.guru[guruIdx].rincian[k];
    }
    schoolData.guru[guruIdx].total = tot;
    
    let elTotal = document.getElementById(`total_guru_${guruIdx}`);
    if(elTotal) elTotal.innerHTML = `<strong>${tot}</strong>`;
}

function renderTabelGuru() {
    let setCls = new Set(); 
    schoolData.mapel.forEach(m => setCls.add(m.kelas));
    schoolData.guru.forEach(g=>Object.keys(g.rincian).forEach(k=>setCls.add(k))); 
    const uCls = Array.from(setCls);
    
    let h=`<div style="overflow-x:auto;"><table class="table-preview table-guru"><tr><th style="text-align:center;">Nama Guru</th><th style="text-align:center;">Mata Pelajaran</th><th style="text-align:center;">Fokus Kls</th>${uCls.map(c=>`<th style="text-align:center;">${c}</th>`).join('')}<th style="text-align:center; width:80px;">Total JP</th></tr>`;
    
    schoolData.guru.forEach((g, idx) => { 
        let badgeColor = g.target==='PA' ? '#3b82f6' : (g.target==='PI' ? '#ec4899' : '#64748b');
        let targetBadge = `<span style="background:${badgeColor}; color:white; padding:2px 6px; border-radius:4px; font-size:10px;">${g.target}</span>`;
        
        h+=`<tr>
                <td>${g.nama}</td>
                <td>${g.mapels}</td>
                <td>${targetBadge}</td>`;
                
        uCls.forEach(c => {
            let jpVal = g.rincian[c] || 0;
            h+=`<td><input type="number" min="0" style="width:50px; text-align:center; padding:5px; border:1px solid #cbd5e1; border-radius:4px; font-weight:600; color:var(--primary);" value="${jpVal}" onchange="updateJPGuru(${idx}, '${c}', this.value)" onkeyup="updateJPGuru(${idx}, '${c}', this.value)"></td>`;
        });
        
        h+=`<td id="total_guru_${idx}"><strong>${g.total}</strong></td></tr>`; 
    });
    document.getElementById('previewGuru').innerHTML = h+`</table></div>`;
}

window.autoDistribusiGuru = function() {
    if(schoolData.mapel.length === 0) {
        return showAlert("Data Mapel (Step 5) masih kosong!", "error");
    }
    if(schoolData.guru.length === 0) {
        return showAlert("Upload daftar Guru (Step 6) terlebih dahulu!", "error");
    }

    schoolData.guru.forEach(g => {
        for(let k in g.rincian) { g.rincian[k] = 0; }
        g.total = 0;
    });

    let kebutuhan = {};
    schoolData.mapel.forEach(m => {
        if(!kebutuhan[m.mapel]) kebutuhan[m.mapel] = {};
        if(!kebutuhan[m.mapel][m.kelas]) kebutuhan[m.mapel][m.kelas] = { PA: 0, PI: 0 };

        let totalRombelPA = 0;
        let totalRombelPI = 0;

        for(let key in schoolData.split) {
            let prefix = key.replace('-Tidak Ada', ''); 
            if(prefix === m.kelas) {
                totalRombelPA += schoolData.split[key].pa;
                totalRombelPI += schoolData.split[key].pi;
            }
        }

        kebutuhan[m.mapel][m.kelas].PA += (m.jp * totalRombelPA);
        kebutuhan[m.mapel][m.kelas].PI += (m.jp * totalRombelPI);
    });

    for(let mapel in kebutuhan) {
        for(let kelas in kebutuhan[mapel]) {
            let butuhPA = kebutuhan[mapel][kelas].PA;
            let butuhPI = kebutuhan[mapel][kelas].PI;

            let guruPA = schoolData.guru.filter(g => g.mapelsArr.includes(mapel) && g.target === 'PA');
            let guruPI = schoolData.guru.filter(g => g.mapelsArr.includes(mapel) && g.target === 'PI');
            let guruBebas = schoolData.guru.filter(g => g.mapelsArr.includes(mapel) && g.target === 'BEBAS');

            if(guruPA.length > 0 && butuhPA > 0) {
               let avg = Math.floor(butuhPA / guruPA.length);
               let sisa = butuhPA % guruPA.length;
               guruPA.forEach((g, i) => { 
                   let assigned = avg + (i < sisa ? 1 : 0);
                   g.rincian[kelas] = (g.rincian[kelas]||0) + assigned; 
                   g.total += assigned; 
               });
               butuhPA = 0;
            }
            
            if(guruPI.length > 0 && butuhPI > 0) {
               let avg = Math.floor(butuhPI / guruPI.length);
               let sisa = butuhPI % guruPI.length;
               guruPI.forEach((g, i) => { 
                   let assigned = avg + (i < sisa ? 1 : 0);
                   g.rincian[kelas] = (g.rincian[kelas]||0) + assigned; 
                   g.total += assigned; 
               });
               butuhPI = 0;
            }
            
            let sisaTotal = butuhPA + butuhPI;
            if(sisaTotal > 0 && guruBebas.length > 0) {
               let avg = Math.floor(sisaTotal / guruBebas.length);
               let sisa = sisaTotal % guruBebas.length;
               guruBebas.forEach((g, i) => { 
                   let assigned = avg + (i < sisa ? 1 : 0);
                   g.rincian[kelas] = (g.rincian[kelas]||0) + assigned; 
                   g.total += assigned; 
               });
            }
        }
    }

    renderTabelGuru();
    showAlert("Distribusi JP Ideal berhasil dihitung!", "success");
}

window.toggleModeSettings = function() { 
    const mode = document.getElementById('modeJadwal').value;
    const label = document.getElementById('labelSettingWaktu');
    if(mode === 'KBM') {
        label.innerText = 'SETTING WAKTU KBM:';
        document.getElementById('jmlHariUjian').value = 6;
        document.getElementById('jmlJPUjian').value = 9;
    } else {
        label.innerText = 'SETTING WAKTU UJIAN:';
        document.getElementById('jmlHariUjian').value = 6;
        document.getElementById('jmlJPUjian').value = 2;
    }
}

window.exportToExcel = function(tableId, filename) {
    if(typeof XLSX === 'undefined') {
        showAlert("Library Excel gagal dimuat. Cek koneksi internet Anda.", "error");
        return;
    }
    
    let visibleTables = [];
    if(tableId === 'ALL') {
        let activeTab = document.querySelector('.tab-content.active');
        if(activeTab) visibleTables = Array.from(activeTab.querySelectorAll('table'));
    } else {
        let activeTab = document.querySelector('.tab-content.active');
        if(activeTab) {
            let wrappers = activeTab.querySelectorAll('.jadwal-wrapper');
            wrappers.forEach(w => {
                if(w.style.display !== 'none') visibleTables.push(w.querySelector('table'));
            });
        }
    }

    if(visibleTables.length === 0) {
        showAlert("Tidak ada tabel yang bisa di-export saat ini.", "warning");
        return;
    }

    var wb = XLSX.utils.book_new();
    let usedNames = new Set();
    
    visibleTables.forEach((table, index) => {
        let sheetName = "Sheet " + (index + 1);
        let titleNode = table.closest('.jadwal-wrapper, .print-page');
        if(titleNode) {
            let hTag = titleNode.querySelector('h3, h2');
            if(hTag) {
                let cleanText = hTag.innerText
                    .replace(/JADWAL MATA PELAJARAN (PTS|PAS) - TINGKAT /ig, 'TGK ')
                    .replace(/JADWAL PENGAWAS (PTS|PAS) - TINGKAT /ig, 'PGWS TGK ')
                    .replace(/JADWAL PENGAWAS (PTS|PAS) - RUANG /ig, 'PGWS R ')
                    .replace(/JADWAL PENGAWAS (PTS|PAS) - SEMUA RUANG/ig, 'PGWS ALL')
                    .replace(/Jadwal Mengajar:/ig, '')
                    .replace(/Kelas:/ig, '')
                    .replace(/[^a-zA-Z0-9 \-]/g, '') 
                    .trim();
                sheetName = cleanText.substring(0, 28).trim();
            }
        }
        if(!sheetName) sheetName = "Sheet " + (index + 1);

        let finalName = sheetName;
        let counter = 1;
        while(usedNames.has(finalName)) {
            finalName = sheetName + " (" + counter + ")";
            counter++;
        }
        usedNames.add(finalName);

        var ws = XLSX.utils.table_to_sheet(table);
        XLSX.utils.book_append_sheet(wb, ws, finalName);
    });

    XLSX.writeFile(wb, filename + ".xlsx");
    showAlert("File Excel berhasil diunduh!", "success");
}

window.jalankanMonteCarlo = function() {
    document.getElementById('loadingOverlay').classList.add('active');
    setTimeout(() => {
        eksekusiAlgoritmaJadwal();
        document.getElementById('loadingOverlay').classList.remove('active');
    }, 100);
}

function eksekusiAlgoritmaJadwal() {
    showStep(9);
    
    const mode = document.getElementById('modeJadwal').value;
    const limitHari = parseInt(document.getElementById('jmlHariUjian').value) || 6;
    const limitSesi = parseInt(document.getElementById('jmlJPUjian').value) || 9; 
    
    const baseHariStr = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    let namaHari = [];
    for(let i=0; i<limitHari; i++) { 
        if(i < 6) {
            namaHari.push(baseHariStr[i]); 
        } else {
            namaHari.push(`Hari ${i+1} (${baseHariStr[i % 6]})`);
        }
    }

    let semuaKelasFisikObj = [];
    schoolData.tingkat.forEach(tk => {
        if(schoolData.jurusan[tk]) {
            schoolData.jurusan[tk].forEach(jur => {
                let key = `${tk}-${jur}`; let prefix = key.replace('-Tidak Ada', ''); 
                if(schoolData.split[key]) {
                    let pa = schoolData.split[key].pa; let pi = schoolData.split[key].pi; let count = 1;
                    for(let i=0; i<pa; i++) { semuaKelasFisikObj.push({ id: `${prefix} ${count} (PA)`, group: prefix, tingkat: tk }); count++; }
                    for(let i=0; i<pi; i++) { semuaKelasFisikObj.push({ id: `${prefix} ${count} (PI)`, group: prefix, tingkat: tk }); count++; }
                }
            });
        }
    });

    let kuotaGuru = {}; 
    schoolData.guru.forEach(g => { for(let grup in g.rincian) kuotaGuru[g.nama + "_" + grup] = g.rincian[grup]; });

    let logPemetaanAwal = []; 
    let pemetaanTugas = {}; 
    
    semuaKelasFisikObj.forEach(kf => {
        pemetaanTugas[kf.id] = {};
        let mapelWajib = schoolData.mapel.filter(m => m.kelas === kf.group);
        
        let isKelasPA = kf.id.includes('(PA)');
        let isKelasPI = kf.id.includes('(PI)');

        mapelWajib.forEach(mw => {
            let guruDitemukan = "BELUM DISET";
            
            let kandidat = schoolData.guru.filter(g => {
                let arrMapel = g.mapelsArr || (g.mapels ? g.mapels.split(',').map(s=>s.trim()) : []);
                let matchMapel = arrMapel.includes(mw.mapel);
                let matchKuota = (kuotaGuru[g.nama + "_" + kf.group] >= mw.jp);
                
                let matchTarget = true;
                if(g.target === 'PA' && !isKelasPA) matchTarget = false;
                if(g.target === 'PI' && !isKelasPI) matchTarget = false;

                return matchMapel && matchKuota && matchTarget;
            });
            
            if(kandidat.length > 0) {
                guruDitemukan = kandidat[0].nama; kuotaGuru[guruDitemukan + "_" + kf.group] -= mw.jp; 
            } else {
                let cekGuruSamaTarget = schoolData.guru.filter(g => {
                    let arrMapel = g.mapelsArr || (g.mapels ? g.mapels.split(',').map(s=>s.trim()) : []);
                    let mapelOk = arrMapel.includes(mw.mapel);
                    let targetOk = true;
                    if(g.target === 'PA' && !isKelasPA) targetOk = false;
                    if(g.target === 'PI' && !isKelasPI) targetOk = false;
                    return mapelOk && targetOk;
                });
                
                let alasan = cekGuruSamaTarget.length === 0 ? 
                    `TIDAK ADA guru untuk mapel <b>"${mw.mapel}"</b> (Atau target PA/PI salah). Cek file Excel.` : 
                    `Sisa kuota JP guru mapel ini untuk <b>${kf.group}</b> sudah <b>Habis/Kurang</b>.`;
                    
                logPemetaanAwal.push({ kelas: kf.id, mapel: mw.mapel, butuh: mw.jp + " JP", alasan: alasan });
            }
            pemetaanTugas[kf.id][mw.mapel] = { guru: guruDitemukan, jp: mw.jp };
        });
    });

    if(mode === 'PTS' || mode === 'PAS') {
        
        let antreanMapelUjian = {};
        let kelompokUnik = [...new Set(semuaKelasFisikObj.map(k=>k.group))];
        kelompokUnik.forEach(kel => {
            antreanMapelUjian[kel] = schoolData.mapel.filter(m => m.kelas === kel).map(m => m.mapel);
        });

        let sortedGuru = [...new Set(schoolData.guru.map(g => g.nama))].sort((a,b) => a.localeCompare(b));
        
        let dictPengawas = {}; 
        let bebanPengawas = {}; 
        
        if(sortedGuru.length === 0) sortedGuru = ["Guru Dummy"];
        sortedGuru.forEach((nama, i) => {
            let kode = (i + 1).toString().padStart(2, '0');
            dictPengawas[nama] = kode;
            bebanPengawas[nama] = 0; 
        });

        let ruangCols = [];
        if(mode === 'PTS') {
            ruangCols = semuaKelasFisikObj.map(k => ({ id: k.id, group: k.group, k1: k }));
        } else {
            let separuh = Math.ceil(semuaKelasFisikObj.length / 2);
            for(let i=0; i<separuh; i++) {
                ruangCols.push({ id: `R-${i+1}`, group: 'Ruang', k1: semuaKelasFisikObj[i], k2: semuaKelasFisikObj[i + separuh] || null });
            }
        }

        let matrixPengawasGlobal = {};
        let logValidasiUjian = [...logPemetaanAwal]; 

        ruangCols.forEach(r => matrixPengawasGlobal[r.id] = {});
        
        namaHari.forEach((hariKey, h_idx) => {
            for(let sesi=1; sesi<=limitSesi; sesi++) {
                let indexAbsolut = (h_idx * limitSesi) + (sesi - 1);
                let pengawasSibukSesiIni = new Set(); 
                
                ruangCols.forEach(r => {
                    let mapelK1 = mode === 'PTS' ? (antreanMapelUjian[r.group][indexAbsolut] || '-') : (antreanMapelUjian[r.k1.group][indexAbsolut] || '-');
                    let mapelK2 = (mode === 'PAS' && r.k2) ? (antreanMapelUjian[r.k2.group][indexAbsolut] || '-') : '-';
                    
                    let guruPengawas = null;
                    let isAdaUjian = (mapelK1 !== '-' || mapelK2 !== '-');
                    
                    if(mapelK1 !== '-') {
                        let dataTugas = pemetaanTugas[r.k1.id][mapelK1];
                        if(dataTugas && dataTugas.guru !== "BELUM DISET") guruPengawas = dataTugas.guru;
                    }
                    if(!guruPengawas && mapelK2 !== '-') {
                        let dataTugas = pemetaanTugas[r.k2.id][mapelK2];
                        if(dataTugas && dataTugas.guru !== "BELUM DISET") guruPengawas = dataTugas.guru;
                    }

                    if(guruPengawas && (isGuruRestricted(guruPengawas, hariKey, sesi) || pengawasSibukSesiIni.has(guruPengawas))) {
                        guruPengawas = null; 
                    } 

                    if(!guruPengawas && isAdaUjian) {
                        let isRuangPA = r.id.includes('(PA)');
                        let isRuangPI = r.id.includes('(PI)');
                        
                        let cadanganList = sortedGuru.filter(namaGuru => {
                            let gData = schoolData.guru.find(g => g.nama === namaGuru);
                            if(!gData) return false;
                            
                            if(pengawasSibukSesiIni.has(namaGuru) || isGuruRestricted(namaGuru, hariKey, sesi)) return false;
                            
                            if(mode === 'PTS') {
                                if(gData.target === 'PA' && !isRuangPA) return false;
                                if(gData.target === 'PI' && !isRuangPI) return false;
                            }
                            return true;
                        });
                        
                        cadanganList.sort((a, b) => bebanPengawas[a] - bebanPengawas[b]);
                        guruPengawas = cadanganList.length > 0 ? cadanganList[0] : null;
                    }

                    if(guruPengawas) {
                        pengawasSibukSesiIni.add(guruPengawas);
                        bebanPengawas[guruPengawas]++; 
                        matrixPengawasGlobal[r.id][indexAbsolut] = dictPengawas[guruPengawas] || '?';
                    } else {
                        matrixPengawasGlobal[r.id][indexAbsolut] = '-';
                        if(isAdaUjian) {
                            logValidasiUjian.push({ kelas: r.id, mapel: mapelK1, butuh: "Sesi " + sesi, alasan: `Semua pengawas sibuk atau dibatasi PA/PI pada ${hariKey} Sesi ${sesi}.` });
                        }
                    }
                });
            }
        });

        let legendHTML = '<div class="legend-container">';
        sortedGuru.forEach(nama => {
            let kode = dictPengawas[nama];
            let totalBeban = bebanPengawas[nama];
            legendHTML += `<div class="legend-item"><b>${kode}</b>: ${nama} <span style="color:#64748b; font-size:11px; font-weight:600;">(${totalBeban} Sesi)</span></div>`;
        });
        legendHTML += '</div>';

        let htmlMapel = `<div class="dynamic-row" style="margin-bottom:15px; background: white; border-left-color: var(--primary);">
                            <label style="width:auto; flex:1; color:var(--primary); font-weight:800;">💡 Siap Cetak Dokumen Ujian.</label>
                            <button onclick="exportToExcel('ALL', 'Jadwal_Mapel_${mode}')" class="btn-action btn-export" style="width:auto; height: 40px; border-radius:6px; background: var(--success);">⬇️ EXCEL (.xlsx)</button>
                            <button onclick="window.print()" class="btn-action btn-export" style="width:auto; height: 40px; border-radius:6px; background: var(--dark);">🖨️ PRINT (A4 Landscape)</button>
                         </div>`;
        
        schoolData.tingkat.forEach(tk => {
            let kelTingkat = kelompokUnik.filter(kel => {
                let parts = kel.split('-'); let parts2 = kel.split(' ');
                return parts[0] === tk || parts2[0] === tk;
            });
            if(kelTingkat.length === 0) return;
            
            htmlMapel += `<div class="print-page">
                <h2>JADWAL MATA PELAJARAN ${mode} - TINGKAT ${tk}</h2>
                <table class="compact-table">
                    <tr><th width="80px">HARI</th><th width="50px">SESI</th>`;
            kelTingkat.forEach(kel => htmlMapel += `<th>${kel}</th>`);
            htmlMapel += `</tr>`;
            
            namaHari.forEach((hariKey, h_idx) => {
                for(let sesi=1; sesi<=limitSesi; sesi++) {
                    let indexAbsolut = (h_idx * limitSesi) + (sesi - 1);
                    htmlMapel += `<tr>`;
                    if(sesi === 1) {
                        let hariLabel = hariKey.replace(' (', '<br><span style="color:#64748b; font-size:10px;">(').replace(')', ')</span>');
                        htmlMapel += `<td rowspan="${limitSesi}"><strong>${hariLabel}</strong></td>`;
                    }
                    htmlMapel += `<td>Ke-${sesi}</td>`;
                    kelTingkat.forEach(kel => {
                        let mapelCetak = antreanMapelUjian[kel][indexAbsolut] || '-';
                        htmlMapel += `<td><b>${mapelCetak}</b></td>`;
                    });
                    htmlMapel += `</tr>`;
                }
            });
            htmlMapel += `</table></div><div class="page-break"></div>`;
        });

        let htmlPengawas = `<div class="dynamic-row" style="margin-bottom:15px; background: white; border-left-color: var(--secondary);">
                            <label style="width:auto; flex:1; color:var(--dark); font-weight:800;">💡 Jadwal Pengawas Ujian per Tingkat/Bagian.</label>
                            <button onclick="exportToExcel('ALL', 'Jadwal_Pengawas_${mode}')" class="btn-action btn-export" style="width:auto; height: 40px; border-radius:6px; background: var(--success);">⬇️ EXCEL (.xlsx)</button>
                            <button onclick="window.print()" class="btn-action btn-export" style="width:auto; height: 40px; border-radius:6px; background: var(--dark);">🖨️ PRINT (A4 Landscape)</button>
                         </div>`;
        
        let arrayChunks = [];
        if(mode === 'PTS') {
            schoolData.tingkat.forEach(tk => {
                let chunk = ruangCols.filter(r => r.k1.tingkat === tk);
                if(chunk.length > 0) arrayChunks.push({ label: `TINGKAT ${tk}`, data: chunk });
            });
        } else {
            for(let i=0; i<ruangCols.length; i+=12) {
                let chunk = ruangCols.slice(i, i+12);
                arrayChunks.push({ label: `RUANG ${chunk[0].id.replace('R-','')} s.d ${chunk[chunk.length-1].id.replace('R-','')}`, data: chunk });
            }
        }

        arrayChunks.forEach(chunkObj => {
            htmlPengawas += `<div class="print-page">
                <h2>JADWAL PENGAWAS ${mode} - ${chunkObj.label}</h2>
                <table class="compact-table">
                    <tr><th width="80px">HARI</th><th width="50px">SESI</th>`;
            chunkObj.data.forEach(r => htmlPengawas += `<th>${mode==='PTS' ? r.id.replace(' ','<br>') : r.id}</th>`);
            htmlPengawas += `</tr>`;

            namaHari.forEach((hariKey, h_idx) => {
                for(let sesi=1; sesi<=limitSesi; sesi++) {
                    let indexAbsolut = (h_idx * limitSesi) + (sesi - 1);
                    
                    htmlPengawas += `<tr>`;
                    if(sesi === 1) {
                        let hariLabel = hariKey.replace(' (', '<br><span style="color:#64748b; font-size:10px;">(').replace(')', ')</span>');
                        htmlPengawas += `<td rowspan="${limitSesi}"><strong>${hariLabel}</strong></td>`;
                    }
                    htmlPengawas += `<td>Ke-${sesi}</td>`;
                    
                    chunkObj.data.forEach(r => {
                        let kode = matrixPengawasGlobal[r.id][indexAbsolut];
                        if(kode !== '-') { htmlPengawas += `<td><b>${kode}</b></td>`; } 
                        else { htmlPengawas += `<td><span style="color:#cbd5e1">-</span></td>`; }
                    });
                    htmlPengawas += `</tr>`;
                }
            });
            htmlPengawas += `</table>`;
            htmlPengawas += `<h3 style="font-size:14px; margin-top:15px; margin-bottom:10px; color: var(--dark); border-bottom:2px solid #e2e8f0; padding-bottom:5px;">Keterangan Kode Pengawas:</h3>${legendHTML}`;
            htmlPengawas += `</div><div class="page-break"></div>`;
        });

        let htmlPengawasAll = `<div class="dynamic-row" style="margin-bottom:15px; background: white; border-left-color: var(--secondary);">
                            <label style="width:auto; flex:1; color:var(--dark); font-weight:800;">💡 Tampilan Semua Kelas/Ruang dalam 1 Tabel Padat.</label>
                            <button onclick="exportToExcel('ALL', 'Jadwal_Pengawas_Semua_${mode}')" class="btn-action btn-export" style="width:auto; height: 40px; border-radius:6px; background: var(--success);">⬇️ EXCEL (.xlsx)</button>
                            <button onclick="window.print()" class="btn-action btn-export" style="width:auto; height: 40px; border-radius:6px; background: var(--dark);">🖨️ PRINT (A4 Landscape)</button>
                         </div>`;
        
        htmlPengawasAll += `<div class="print-page">
                <h2>JADWAL PENGAWAS ${mode} - SEMUA RUANG</h2>
                <table class="compact-table-all">
                    <tr><th width="60px">HARI</th><th width="30px">SESI</th>`;
        ruangCols.forEach(r => htmlPengawasAll += `<th>${mode==='PTS' ? r.id.replace(' ','<br>') : r.id}</th>`);
        htmlPengawasAll += `</tr>`;

        namaHari.forEach((hariKey, h_idx) => {
            for(let sesi=1; sesi<=limitSesi; sesi++) {
                let indexAbsolut = (h_idx * limitSesi) + (sesi - 1);
                htmlPengawasAll += `<tr>`;
                if(sesi === 1) {
                    let hariLabel = hariKey.replace(' (', '<br><span style="color:#64748b; font-size:9px;">(').replace(')', ')</span>');
                    htmlPengawasAll += `<td rowspan="${limitSesi}"><strong>${hariLabel}</strong></td>`;
                }
                htmlPengawasAll += `<td>Ke-${sesi}</td>`;
                
                ruangCols.forEach(r => {
                    let kode = matrixPengawasGlobal[r.id][indexAbsolut];
                    if(kode !== '-') { htmlPengawasAll += `<td><b>${kode}</b></td>`; } 
                    else { htmlPengawasAll += `<td><span style="color:#cbd5e1">-</span></td>`; }
                });
                htmlPengawasAll += `</tr>`;
            }
        });
        htmlPengawasAll += `</table>`;
        htmlPengawasAll += `<h3 style="font-size:14px; margin-top:15px; margin-bottom:10px; color: var(--dark); border-bottom:2px solid #e2e8f0; padding-bottom:5px;">Keterangan Kode Pengawas:</h3>${legendHTML}`;
        htmlPengawasAll += `</div><div class="page-break"></div>`;

        let htmlValidasi = ``;
        if(logValidasiUjian.length > 0) {
            htmlValidasi += `<div class="validator-box" style="display:block;">
                                <h3>⚠️ Terdapat ${logValidasiUjian.length} Peringatan / Error Terdeteksi</h3>
                                <p style="color:#7f1d1d;">Harap periksa kembali ketersediaan guru atau jam batasan di file CSV dan Step 7.</p>
                                <div style="overflow-x: auto;"><table class="compact-table validator-table" style="margin-top:15px;">
                                <tr><th style="text-align:center;">Ruang/Kelas</th><th style="text-align:center;">Mapel/Tugas</th><th style="text-align:center;">Keterangan Waktu/JP</th><th style="text-align:center;">Alasan Gagal</th></tr>`;
            logValidasiUjian.forEach(log => { htmlValidasi += `<tr><td><strong>${log.kelas}</strong></td><td style="color:white; background:var(--danger);"><b>${log.mapel}</b></td><td style="text-align:center; font-weight:bold;">${log.butuh}</td><td>${log.alasan}</td></tr>`; });
            htmlValidasi += `</table></div></div>`;
        } else {
            // PERBAIKAN: Kotak bersih dengan teks elegan (Tanpa Box Merah)
            htmlValidasi += `<div style="text-align:center; padding:40px; color:var(--success); background:white; border-radius:8px; border:2px dashed var(--success);">
                                <h3 style="margin-top:0; font-size:24px;">✅ Sempurna (0 Error)</h3>
                                <p style="font-weight:600; color:#475569;">Semua jadwal ujian memiliki pengawas valid tanpa bentrok!</p>
                             </div>`;
        }

        let outputHTML = `
            <div class="tabs">
                <button class="tab-btn active" id="btn-tab-ujian" onclick="switchTab('tab-ujian')">📅 Jadwal Mapel</button>
                <button class="tab-btn" id="btn-tab-pengawas" onclick="switchTab('tab-pengawas')">👁️ Pengawas (Terpisah)</button>
                <button class="tab-btn" id="btn-tab-pengawas-all" onclick="switchTab('tab-pengawas-all')">👁️ Pengawas (Semua)</button>
                <button class="tab-btn" id="btn-tab-analisis" onclick="switchTab('tab-analisis')">⚠️ Log Analisis ${logValidasiUjian.length>0 ? `<span class="badge">${logValidasiUjian.length}</span>` : ''}</button>
            </div>
            <div id="tab-ujian" class="tab-content active">${htmlMapel}</div>
            <div id="tab-pengawas" class="tab-content">${htmlPengawas}</div>
            <div id="tab-pengawas-all" class="tab-content">${htmlPengawasAll}</div>
            <div id="tab-analisis" class="tab-content">${htmlValidasi}</div>
        `;

        document.getElementById('finalOutputArea').innerHTML = outputHTML;
        showAlert(`Jadwal ${mode} Berhasil Dibuat!`, "success");
        if(logValidasiUjian.length > 0) window.scrollTo({ top: document.getElementById('finalOutputArea').offsetTop - 50, behavior: 'smooth' });
        return;
    }

    // ===============================================
    // CABANG 2: KBM (REGULER) - MONTE CARLO + CHUNKING
    // ===============================================
    let baseTugasSatuan = [];
    semuaKelasFisikObj.forEach(kf => {
        for(let m in pemetaanTugas[kf.id]) { 
            let info = pemetaanTugas[kf.id][m];
            let jp_sisa = info.jp;
            
            while(jp_sisa >= 2) {
                baseTugasSatuan.push({ kelasId: kf.id, mapel: m, guru: info.guru, durasi: 2 });
                jp_sisa -= 2;
            }
            if(jp_sisa === 1) {
                baseTugasSatuan.push({ kelasId: kf.id, mapel: m, guru: info.guru, durasi: 1 });
            }
        }
    });

    let bestJadwalKelas = null;
    let bestJadwalGuru = null;
    let bestLogValidasi = null;
    let minErrors = Infinity;
    const MAX_ITERATIONS = 500;
    
    for(let i = 0; i < MAX_ITERATIONS; i++) {
        let currentJadwalKelas = {}; 
        let currentJadwalGuru = {}; 
        let currentLog = [];

        semuaKelasFisikObj.forEach(kf => {
            currentJadwalKelas[kf.id] = {};
            namaHari.forEach(h => { currentJadwalKelas[kf.id][h] = {}; for(let j=1; j<=limitSesi; j++) currentJadwalKelas[kf.id][h][j] = null; });
        });

        let iterTugas = [...baseTugasSatuan].sort((a, b) => {
            if(b.durasi !== a.durasi) return b.durasi - a.durasi; 
            return Math.random() - 0.5;
        });

        iterTugas.forEach(tugas => {
            let berhasilPlot = false;
            
            if(tugas.guru === "BELUM DISET") {
                currentLog.push({ kelas: tugas.kelasId, mapel: tugas.mapel, butuh: "Blok " + tugas.durasi + " JP", alasan: `Guru untuk kelas dan mapel ini TIDAK DITEMUKAN / Target PA-PI Tidak Cocok.` });
                return; 
            }

            if(!currentJadwalGuru[tugas.guru]) { 
                currentJadwalGuru[tugas.guru] = {}; 
                namaHari.forEach(h => currentJadwalGuru[tugas.guru][h] = {}); 
            }
            
            let hariAcak = [...namaHari].sort(() => Math.random() - 0.5);
            
            for(let h=0; h<hariAcak.length && !berhasilPlot; h++) {
                let hari = hariAcak[h]; 
                let sudahAdaMapelIni = false;
                for(let k=1; k<=limitSesi; k++) { 
                    if(currentJadwalKelas[tugas.kelasId][hari][k] && currentJadwalKelas[tugas.kelasId][hari][k].mapel === tugas.mapel) {
                        sudahAdaMapelIni = true; break;
                    }
                }
                if(sudahAdaMapelIni) continue; 
                
                let sesiAcak = [];
                for(let j=1; j <= limitSesi - tugas.durasi + 1; j++) sesiAcak.push(j);
                sesiAcak.sort(() => Math.random() - 0.5);

                for(let x=0; x<sesiAcak.length && !berhasilPlot; x++) {
                    let j = sesiAcak[x];
                    let aman = true;
                    for(let d=0; d<tugas.durasi; d++) {
                        let currSesi = j + d;
                        if(currentJadwalKelas[tugas.kelasId][hari][currSesi] !== null) { aman = false; break; }
                        if(currentJadwalGuru[tugas.guru][hari][currSesi]) { aman = false; break; }
                        if(isGuruRestricted(tugas.guru, hari, currSesi)) { aman = false; break; }
                    }
                    
                    if(aman) {
                        for(let d=0; d<tugas.durasi; d++) {
                            let currSesi = j + d;
                            currentJadwalKelas[tugas.kelasId][hari][currSesi] = { mapel: tugas.mapel, guru: tugas.guru };
                            currentJadwalGuru[tugas.guru][hari][currSesi] = { kelas: tugas.kelasId, mapel: tugas.mapel }; 
                        }
                        berhasilPlot = true;
                    }
                }
            }

            if(!berhasilPlot) {
                for(let h=0; h<hariAcak.length && !berhasilPlot; h++) {
                    let hari = hariAcak[h]; 
                    let sesiAcak = [];
                    for(let j=1; j <= limitSesi - tugas.durasi + 1; j++) sesiAcak.push(j);
                    sesiAcak.sort(() => Math.random() - 0.5);

                    for(let x=0; x<sesiAcak.length && !berhasilPlot; x++) {
                        let j = sesiAcak[x];
                        let aman = true;
                        for(let d=0; d<tugas.durasi; d++) {
                            let currSesi = j + d;
                            if(currentJadwalKelas[tugas.kelasId][hari][currSesi] !== null) { aman = false; break; }
                            if(currentJadwalGuru[tugas.guru][hari][currSesi]) { aman = false; break; }
                            if(isGuruRestricted(tugas.guru, hari, currSesi)) { aman = false; break; }
                        }
                        
                        if(aman) {
                            for(let d=0; d<tugas.durasi; d++) {
                                let currSesi = j + d;
                                currentJadwalKelas[tugas.kelasId][hari][currSesi] = { mapel: tugas.mapel, guru: tugas.guru };
                                currentJadwalGuru[tugas.guru][hari][currSesi] = { kelas: tugas.kelasId, mapel: tugas.mapel }; 
                            }
                            berhasilPlot = true;
                        }
                    }
                }
            }
            
            if(!berhasilPlot) {
                currentLog.push({ kelas: tugas.kelasId, mapel: tugas.mapel, butuh: "Blok " + tugas.durasi + " JP", alasan: `Kepadatan jadwal tinggi. Ruang/Waktu guru <b>${tugas.guru}</b> bentrok.` });
            }
        });

        let totalErrors = logPemetaanAwal.length + currentLog.length;

        if(totalErrors < minErrors) {
            minErrors = totalErrors;
            bestJadwalKelas = JSON.parse(JSON.stringify(currentJadwalKelas));
            bestJadwalGuru = JSON.parse(JSON.stringify(currentJadwalGuru));
            bestLogValidasi = [...logPemetaanAwal, ...currentLog];
        }
        if(minErrors === 0) break;
    }

    let jadwalKelas = bestJadwalKelas;
    let jadwalGuru = bestJadwalGuru;
    logValidasi = bestLogValidasi;

    let totalSesiKosong = 0;
    semuaKelasFisikObj.forEach(kf => {
        namaHari.forEach(h => {
            for(let j=1; j<=limitSesi; j++) {
                if(!jadwalKelas[kf.id][h][j]) totalSesiKosong++;
            }
        });
    });

    let opsiFilter = '<option value="all">Tampilkan Semua</option>';
    [...new Set(semuaKelasFisikObj.map(k=>k.group))].forEach(g => opsiFilter += `<option value="${g}">Hanya Kelompok: ${g}</option>`);
    
    let htmlHasil = `<div class="dynamic-row" style="margin-bottom:15px; background: white;">
                        <label style="font-weight:800;">Filter Kelas:</label>
                        <select id="filterCetak" style="flex:1; padding: 10px;" onchange="terapkanFilterKBM()">${opsiFilter}</select>
                        <button onclick="exportToExcel('KBM', 'Jadwal_Kelas_Reguler')" class="btn-action btn-export" style="margin-left:15px; width:auto; height: 40px; border-radius:6px; background: var(--success);">⬇️ EXCEL</button>
                        <button onclick="window.print()" class="btn-action btn-export" style="margin-left:10px; width:auto; height: 40px; border-radius:6px; background: var(--dark);">🖨️ PRINT (A4 Landscape)</button>
                     </div>`;
    
    let statBoxId = "stat-kosong";
    htmlHasil += `<div class="stat-box" style="display: inline-flex; align-items: center; gap: 10px; padding: 10px 20px; background: var(--dark); color: white; border-radius: 6px; margin-bottom: 20px; font-weight: 700; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">🕒 Terdapat <span style="font-size: 24px; color: #facc15;" id="${statBoxId}">0</span> Jam Pelajaran Kosong secara keseluruhan minggu ini.</div>`;

    semuaKelasFisikObj.forEach(kf => {
        htmlHasil += `<div class="jadwal-wrapper" data-group="${kf.group}">
                        <h3><span style="font-size:22px;">🪧</span> Kelas: ${kf.id}</h3>
                        <div style="overflow-x: auto;">
                            <table>
                                <tr><th width="100" style="text-align:center;">Jam Ke-</th>`;
        namaHari.forEach(h => htmlHasil += `<th style="text-align:center;">${h}</th>`);
        htmlHasil += `</tr>`;
        for(let j=1; j<=limitSesi; j++) {
            htmlHasil += `<tr><td style="text-align:center;"><strong>Jam ${j}</strong></td>`;
            namaHari.forEach(h => {
                let slot = jadwalKelas[kf.id][h][j];
                if(slot) {
                    let classExtra = slot.guru === "BELUM DISET" ? "cell-kosong" : "";
                    htmlHasil += `<td class="cell-jadwal ${classExtra}"><span class="mapel-name">${slot.mapel}</span><span class="guru-name">${slot.guru}</span></td>`;
                } else {
                    htmlHasil += `<td class="cell-jadwal" style="color:#94a3b8; background:#f8fafc;">Kosong / Istirahat</td>`;
                }
            });
            htmlHasil += `</tr>`;
        }
        htmlHasil += `</table></div></div>`;
    });

    let htmlGuru = `<div class="dynamic-row" style="margin-bottom:15px; background: white; border-left-color: var(--secondary);"><label style="font-weight:800;">Filter Guru:</label><select id="filterCetakGuru" style="flex:1; padding: 10px;" onchange="terapkanFilterGuru()"><option value="all">Tampilkan Semua Guru</option>`;
    let sortedGuruKBM = Object.keys(jadwalGuru).sort();
    sortedGuruKBM.forEach(g => { htmlGuru += `<option value="${g}">${g}</option>`; });
    htmlGuru += `</select>
                 <button onclick="exportToExcel('GURU', 'Jadwal_Guru_Mengajar')" class="btn-action btn-export" style="margin-left:15px; width:auto; height: 40px; border-radius:6px; background: var(--success);">⬇️ EXCEL</button>
                 <button onclick="window.print()" class="btn-action btn-export" style="margin-left:10px; width:auto; height: 40px; border-radius:6px; background: var(--dark);">🖨️ PRINT JADWAL GURU</button></div>`;

    sortedGuruKBM.forEach(guruName => {
        htmlGuru += `<div class="jadwal-wrapper guru-wrapper" data-guru="${guruName}">
                        <h3 style="color: white; background: var(--secondary);"><span style="font-size:22px;">👨‍🏫</span> Jadwal Mengajar: ${guruName}</h3>
                        <div style="overflow-x: auto;">
                            <table>
                                <tr><th width="100" style="text-align:center; background: #eaf2f8; color: var(--secondary);">Jam Ke-</th>`;
        namaHari.forEach(h => htmlGuru += `<th style="text-align:center; background: #eaf2f8; color: var(--secondary);">${h}</th>`);
        htmlGuru += `</tr>`;
        for(let j=1; j<=limitSesi; j++) {
            htmlGuru += `<tr><td style="text-align:center;"><strong>Jam ${j}</strong></td>`;
            namaHari.forEach(h => {
                let slot = jadwalGuru[guruName][h][j];
                if(slot) { htmlGuru += `<td class="cell-jadwal"><span class="mapel-name">${slot.kelas}</span><span class="guru-name">${slot.mapel}</span></td>`;
                } else htmlGuru += `<td class="cell-jadwal" style="color:#94a3b8; background:#f8fafc;">-</td>`;
            });
            htmlGuru += `</tr>`;
        }
        htmlGuru += `</table></div></div>`;
    });

    let htmlValidasi = ``;
    if(logValidasi.length > 0) {
        htmlValidasi += `<div class="validator-box" style="display:block;">
                            <h3>⚠️ Ditemukan ${logValidasi.length} Peringatan / Error Terdeteksi</h3>
                            <div style="overflow-x: auto;"><table class="compact-table validator-table" style="margin-top:10px;">
                            <tr><th style="text-align:center;">Ruang Kelas</th><th style="text-align:center;">Mata Pelajaran</th><th style="text-align:center;">Keterangan Waktu/JP</th><th style="text-align:center;">Alasan Gagal / Analisis Sistem</th></tr>`;
        logValidasi.forEach(log => { htmlValidasi += `<tr><td><strong>${log.kelas}</strong></td><td style="color:#fff; background:#c0392b;"><b>${log.mapel}</b></td><td style="text-align:center; font-weight:bold;">${log.butuh}</td><td>${log.alasan}</td></tr>`; });
        htmlValidasi += `</table></div></div>`;
    } else {
        // PERBAIKAN: UI Bersih untuk status "0 Error" di Jadwal KBM
        htmlValidasi += `<div style="text-align:center; padding:40px; color:var(--success); background:white; border-radius:8px; border:2px dashed var(--success);">
                            <h3 style="margin-top:0; font-size:24px;">✅ Sempurna (0 Error)</h3>
                            <p style="font-weight:600; color:#475569;">Berhasil menemukan kombinasi terbaik. Semua mapel ter-plot tanpa bentrok!</p>
                         </div>`;
    }

    let outputHTML = `
        <div class="tabs">
            <button class="tab-btn active" id="btn-tab-hasil" onclick="switchTab('tab-hasil')">📅 Jadwal Kelas</button>
            <button class="tab-btn" id="btn-tab-guru" onclick="switchTab('tab-guru')">👨‍🏫 Jadwal Guru</button>
            <button class="tab-btn" id="btn-tab-analisis" onclick="switchTab('tab-analisis')">⚠️ Log Analisis ${logValidasi.length>0 ? `<span class="badge">${logValidasi.length}</span>` : ''}</button>
        </div>
        <div id="tab-hasil" class="tab-content active">${htmlHasil}</div>
        <div id="tab-guru" class="tab-content">${htmlGuru}</div>
        <div id="tab-analisis" class="tab-content">${htmlValidasi}</div>
    `;

    document.getElementById('finalOutputArea').innerHTML = outputHTML;
    
    if(document.getElementById(statBoxId)) {
        document.getElementById(statBoxId).innerText = totalSesiKosong;
    }

    showAlert("Jadwal KBM Berhasil Di-generate!", "success");
    if(logValidasi.length > 0) window.scrollTo({ top: document.getElementById('finalOutputArea').offsetTop - 50, behavior: 'smooth' });
}

window.terapkanFilterKBM = function() {
    let keyword = document.getElementById('filterCetak').value;
    document.querySelectorAll('#tab-hasil .jadwal-wrapper').forEach(tabel => { tabel.style.display = (keyword === 'all' || tabel.getAttribute('data-group') === keyword) ? 'block' : 'none'; });
}

window.terapkanFilterGuru = function() {
    let keyword = document.getElementById('filterCetakGuru').value;
    document.querySelectorAll('.guru-wrapper').forEach(tabel => { tabel.style.display = (keyword === 'all' || tabel.getAttribute('data-guru') === keyword) ? 'block' : 'none'; });
}