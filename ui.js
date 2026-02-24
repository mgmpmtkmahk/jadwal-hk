// ==========================================
// UI COMPONENTS: TOAST, MODAL, TABS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Modal Konfirmasi bawaan
    const btnConfirmYes = document.getElementById('btnConfirmYes');
    if(btnConfirmYes) {
        btnConfirmYes.addEventListener('click', () => { 
            closeConfirmModal(); 
            if(confirmCallback) confirmCallback(); 
        });
    }

    // 2. Mendaftarkan Event Listener untuk tombol-tombol Global
    document.getElementById('btnCleanDraft').addEventListener('click', cleanDraft);
    document.getElementById('btnBackup').addEventListener('click', downloadProgressFile);
    document.getElementById('inputRestore').addEventListener('change', uploadProgressFile);

    // 3. Mendaftarkan Event Listener untuk Tombol Generate Saja
    const btnGenerate = document.getElementById('btnGenerate');
    if(btnGenerate) {
        btnGenerate.addEventListener('click', jalankanGenerator);
    }

    // 4. AUTO-LOAD DATA DENGAN MODE SENYAP (SILENT)
    loadDraft(true);

    // Auto-update Tahun Ajaran di Kop Global
    const thnGlobal = new Date().getFullYear();
    const elThn = document.getElementById('tahunKopGlobal');
    if(elThn) elThn.innerText = `Tahun Ajaran ${thnGlobal}/${thnGlobal + 1}`;
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

// ==========================================
// WIZARD NAVIGATION & VALIDATION
// ==========================================
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
    renderSavedSchedules();
}

// ==========================================
// NAVIGASI SIDEBAR DASHBOARD
// ==========================================
window.openMenu = function(menuId, btnElement) {
    // Sembunyikan semua konten halaman
    document.querySelectorAll('.page-content').forEach(el => el.classList.remove('active'));
    // Munculkan konten yang diklik
    document.getElementById(menuId).classList.add('active');
    
    // Matikan warna aktif di semua tombol sidebar
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    // Nyalakan warna aktif di tombol yang diklik
    btnElement.classList.add('active');
}

// ==========================================
// PROSES FORM ROMBEL (Pengganti Step 1-4)
// ==========================================
window.prosesDataRombel = function() {
    // 1. Ambil dan validasi input tingkat
    let t = document.getElementById('inputTingkat').value.trim();
    if(!t) return showAlert("Isi Tingkat Kelas terlebih dahulu!", "warning");
    let tArray = t.split(',').map(s=>s.trim());

    // Cek apakah tingkat berubah
    let tingkatBerubah = JSON.stringify(schoolData.tingkat) !== JSON.stringify(tArray);
    if(tingkatBerubah) {
        schoolData.tingkat = tArray;
        prepareNextStepData(2); // Render ulang form jurusan
        document.getElementById('formParalelArea').innerHTML = '<p class="empty-text">Isi form sebelumnya untuk memunculkan form ini.</p>';
        document.getElementById('formSplitArea').innerHTML = '<p class="empty-text">Isi form sebelumnya untuk memunculkan form ini.</p>';
        return showAlert("Tingkat Kelas disimpan! Silakan isi Rincian Jurusan.", "success");
    }

    // 2. Ambil dan validasi input jurusan
    let jurInput = document.getElementById(`jurusan_${schoolData.tingkat[0]}`);
    if(!jurInput) {
        prepareNextStepData(2);
        return showAlert("Silakan isi Rincian Jurusan.", "success");
    }

    let jurusanBaru = {};
    for(let tk of schoolData.tingkat){
        let v = document.getElementById(`jurusan_${tk}`).value.trim();
        if(!v) return showAlert(`Jurusan untuk kelas ${tk} kosong!`, "error");
        jurusanBaru[tk] = v.split(',').map(s=>s.trim());
    }

    let jurusanBerubah = JSON.stringify(schoolData.jurusan) !== JSON.stringify(jurusanBaru);
    if(jurusanBerubah || !document.getElementById(`paralel_${schoolData.tingkat[0]}-${jurusanBaru[schoolData.tingkat[0]][0]}`)) {
        schoolData.jurusan = jurusanBaru;
        prepareNextStepData(3); // Render form paralel
        document.getElementById('formSplitArea').innerHTML = '<p class="empty-text">Isi form sebelumnya untuk memunculkan form ini.</p>';
        return showAlert("Jurusan disimpan! Silakan isi Jumlah Kelas Paralel.", "success");
    }

    // 3. Ambil dan validasi input paralel
    let kFirst = schoolData.tingkat[0] + "-" + schoolData.jurusan[schoolData.tingkat[0]][0];
    let parInput = document.getElementById(`paralel_${kFirst}`);
    if(!parInput) {
        prepareNextStepData(3);
        return showAlert("Silakan isi Jumlah Kelas Paralel.", "success");
    }

    let paralelBaru = {};
    for(let tk of schoolData.tingkat) {
        for(let jur of schoolData.jurusan[tk]){
            let k=`${tk}-${jur}`;
            let v=document.getElementById(`paralel_${k}`).value;
            if(!v||v<1) return showAlert(`Paralel ${k} tidak valid (minimal 1)!`, "error");
            paralelBaru[k]=parseInt(v);
        }
    }

    let paralelBerubah = JSON.stringify(schoolData.paralel) !== JSON.stringify(paralelBaru);
    if(paralelBerubah || !document.getElementById(`split_pa_${Object.keys(paralelBaru)[0]}`)) {
        schoolData.paralel = paralelBaru;
        prepareNextStepData(4); // Render form split gender
        return showAlert("Kelas Paralel disimpan! Silakan isi Pemisahan Gender (PA/PI).", "success");
    }

    // 4. Validasi Pemisahan Gender (PA/PI)
    let splitBaru = {};
    for(let k in schoolData.paralel){
        const tTotal=schoolData.paralel[k];
        const pa=parseInt(document.getElementById(`split_pa_${k}`).value)||0;
        const pi=parseInt(document.getElementById(`split_pi_${k}`).value)||0;
        if(pa+pi !== tTotal) {
            return showAlert(`Total PA+PI di ${k} harus sama dengan ${tTotal}!`, "error");
        }
        splitBaru[k] = {pa, pi};
    }

    // Semua berhasil! Simpan ke sistem
    schoolData.split = splitBaru;
    saveDraft(true); // Simpan diam-diam (silent)
    showAlert("Data Rombel selesai & tersimpan! Silakan pindah ke menu '2. Data Mapel' di kiri.", "success");
}

function prepareNextStepData(ns) {
    if(ns===2){ let h=''; schoolData.tingkat.forEach(tk=>{ h+=`<div class="dynamic-row"><label>Rincian Kelas ${tk}:</label><input type="text" id="jurusan_${tk}" placeholder="Contoh: IPA, IPS atau Tidak Ada"></div>`; }); document.getElementById('formJurusanArea').innerHTML=h; }
    else if(ns===3){ let h=''; schoolData.tingkat.forEach(tk=>schoolData.jurusan[tk].forEach(jur=>{ const lbl=jur.toLowerCase()==='tidak ada'?tk:`${tk} ${jur}`; h+=`<div class="dynamic-row"><label>Jumlah Rombel Kelas ${lbl}:</label><input type="number" id="paralel_${tk}-${jur}" min="1"></div>`; })); document.getElementById('formParalelArea').innerHTML=h; }
    else if(ns===4){ let h=''; for(let k in schoolData.paralel){ const t=schoolData.paralel[k], lbl=k.replace('-Tidak Ada',''); h+=`<div class="dynamic-row"><label>${lbl} (Total: ${t}):</label> Jumlah Kelas Putra:<input type="number" id="split_pa_${k}" min="0"> Jumlah Kelas Putri:<input type="number" id="split_pi_${k}" min="0"></div>`; } document.getElementById('formSplitArea').innerHTML=h; }
    else if(ns===7){
        let opts = '<option value="">-- Pilih Guru Dulu --</option>';
        let sortedGuru = [...new Set(schoolData.guru.map(g=>g.nama))].sort();
        sortedGuru.forEach(g => { opts += `<option value="${g}">${g}</option>`; });
        document.getElementById('restrictGuru').innerHTML = opts;
        renderBatasan();
    }
}

// ==========================================
// RENDER TABEL & FORM DINAMIS (Mapel & Guru)
// ==========================================
window.tambahBatasan = function() {
    let guru = document.getElementById('restrictGuru').value;
    let jamRaw = document.getElementById('restrictJam').value;
    
    if(!guru) { return showAlert("Pilih nama guru terlebih dahulu!", "warning"); }

    // Mengambil semua nilai checkbox hari yang dicentang user
    let checkedHari = Array.from(document.querySelectorAll('#restrictHariGroup input[type="checkbox"]:checked')).map(cb => cb.value);

    if(checkedHari.length === 0) {
        return showAlert("Centang minimal satu hari izin!", "warning");
    }
    
    let jamClean = "";
    if(jamRaw.trim() !== "") {
        let parts = jamRaw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if(parts.length === 0) {
            return showAlert("Format Jam salah! Gunakan angka dipisah koma (contoh: 1, 2).", "error");
        }
        jamClean = parts.join(', ');
    }

    if(!schoolData.batasan) schoolData.batasan = [];
    
    // Mendaftarkan batasan ke memori untuk setiap hari yang dicentang
    checkedHari.forEach(hariPilihan => {
        schoolData.batasan.push({guru: guru, hari: hariPilihan, jam: jamClean});
    });
    
    renderBatasan();
    saveDraft(true); // Otomatis simpan ke memori diam-diam
    
    showAlert(`Batasan waktu berhasil ditambahkan untuk ${checkedHari.length} hari!`, "success");
    
    // Reset form agar siap digunakan kembali
    document.getElementById('restrictJam').value = ''; 
    document.querySelectorAll('#restrictHariGroup input[type="checkbox"]').forEach(cb => cb.checked = false);
}

window.hapusBatasan = function(idx) {
    schoolData.batasan.splice(idx, 1);
    renderBatasan();
    saveDraft(true); // Simpan otomatis saat dihapus
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

// ==========================================
// FITUR INLINE EDIT JP MAPEL
// ==========================================
window.updateJPMapel = function(mapelName, kelasName, value) {
    let val = parseInt(value) || 0;
    let existing = schoolData.mapel.find(x => x.mapel === mapelName && x.kelas === kelasName);
    
    if(existing) {
        existing.jp = val; 
    } else {
        if(val > 0) schoolData.mapel.push({kelas: kelasName, mapel: mapelName, jp: val}); 
    }
    
    // Bersihkan mapel yang JP-nya dinolkan agar memori tidak bengkak
    schoolData.mapel = schoolData.mapel.filter(m => m.jp > 0); 
    saveDraft(true); // Simpan diam-diam tanpa memunculkan notif
}

window.renderTabelMapel = function() {
    if(!schoolData.mapel || schoolData.mapel.length === 0) return;
    const uCls = [...new Set(schoolData.mapel.map(m=>m.kelas))];
    const uMap = [...new Set(schoolData.mapel.map(m=>m.mapel))];
    
    let h = `<div style="overflow-x:auto;"><table class="table-preview table-mapel"><tr><th style="text-align:center;">Mata Pelajaran</th>${uCls.map(c=>`<th style="text-align:center;">${c}</th>`).join('')}</tr>`;
    
    uMap.forEach(m => { 
        h += `<tr><td>${m}</td>${uCls.map(c => { 
            const d = schoolData.mapel.find(x=>x.mapel === m && x.kelas === c); 
            let jpVal = d ? d.jp : 0;
            // Input box keren dengan fungsi update tanpa re-render (agar kursor tidak hilang saat mengetik)
            return `<td><input type="number" min="0" style="width:50px; text-align:center; padding:5px; border:1px solid #cbd5e1; border-radius:4px; font-weight:600; color:var(--primary);" value="${jpVal}" onchange="updateJPMapel('${m}', '${c}', this.value)" onkeyup="updateJPMapel('${m}', '${c}', this.value)"></td>`; 
        }).join('')}</tr>`; 
    });
    // TAMBAHAN: Update dropdown Kunci Mapel
    let opts = '<option value="">-- Pilih Mapel --</option>';
    uMap.forEach(m => opts += `<option value="${m}">${m}</option>`);
    let lockDropdown = document.getElementById('lockMapel');
    if(lockDropdown) lockDropdown.innerHTML = opts;
    if(typeof renderLockMapel === 'function') renderLockMapel();
    document.getElementById('previewMapel').innerHTML = h + `</table></div>`;
    let fasDropdown = document.getElementById('fasilitasMapel');
    if(fasDropdown) fasDropdown.innerHTML = opts;
    if(typeof renderFasilitas === 'function') renderFasilitas();
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
        renderTabelGuru(); 
        prepareNextStepData(7); // Tambahkan baris ini agar dropdown langsung terisi!
        showAlert("Data Guru berhasil dimuat.", "success");
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

window.renderTabelGuru = function() {
    let setCls = new Set(); 
    schoolData.mapel.forEach(m => setCls.add(m.kelas));
    schoolData.guru.forEach(g=>Object.keys(g.rincian).forEach(k=>setCls.add(k))); 
    const uCls = Array.from(setCls);
    
    let h=`<div style="overflow-x:auto;"><table class="table-preview table-guru"><tr><th style="text-align:center;">Nama Guru</th><th style="text-align:center;">Mata Pelajaran</th><th style="text-align:center;">Fokus Kelas</th>${uCls.map(c=>`<th style="text-align:center;">${c}</th>`).join('')}<th style="text-align:center; width:80px;">Total JP</th></tr>`;
    
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

window.toggleModeSettings = function() { 
    const mode = document.getElementById('modeJadwal').value;
    const label = document.getElementById('labelSettingWaktu');
    const labelSesi = document.getElementById('labelSesiUjian'); // Memanggil span label yang baru kita beri ID

    if(mode === 'KBM') {
        label.innerText = 'SETTING WAKTU KBM:';
        labelSesi.innerText = 'JP/Hari:'; // Ubah teks jadi JP
        document.getElementById('jmlHariUjian').value = 6;
        document.getElementById('jmlJPUjian').value = 9;
    } else {
        label.innerText = 'SETTING WAKTU UJIAN:';
        labelSesi.innerText = 'Sesi/Hari:'; // Ubah teks jadi Sesi
        document.getElementById('jmlHariUjian').value = 10;
        document.getElementById('jmlJPUjian').value = 2;
    }
}

window.terapkanFilterKBM = function() {
    let keyword = document.getElementById('filterCetak').value;
    document.querySelectorAll('#tab-hasil .jadwal-wrapper').forEach(tabel => { tabel.style.display = (keyword === 'all' || tabel.getAttribute('data-group') === keyword) ? 'block' : 'none'; });
}

window.terapkanFilterGuru = function() {
    let keyword = document.getElementById('filterCetakGuru').value;
    document.querySelectorAll('.guru-wrapper').forEach(tabel => { tabel.style.display = (keyword === 'all' || tabel.getAttribute('data-guru') === keyword) ? 'block' : 'none'; });
}

// ==========================================
// FITUR DRAG AND DROP JADWAL (MANUAL SWAP)
// ==========================================
window.dragStart = function(ev) {
    // Simpan ID dari kotak yang sedang ditarik
    ev.dataTransfer.setData("text", ev.target.id);
    ev.target.style.opacity = "0.4"; // Beri efek transparan saat ditarik
}

window.dragOver = function(ev) {
    // Wajib ada agar elemen mengizinkan kotak lain dijatuhkan di atasnya
    ev.preventDefault(); 
}

window.dropCell = function(ev, kelasTarget) {
    ev.preventDefault();
    
    // Dapatkan ID kotak asal yang ditarik
    let sourceId = ev.dataTransfer.getData("text");
    let sourceEl = document.getElementById(sourceId);
    let targetEl = ev.currentTarget; 

    // Kembalikan opacity kotak asal menjadi normal
    if(sourceEl) sourceEl.style.opacity = "1"; 
    if(!sourceEl || sourceEl === targetEl) return;

    // ====================================================
    // FITUR SMART VALIDATION (ANTI-BENTROK)
    // ====================================================
    let guruSourceEl = sourceEl.querySelector('.guru-name');
    let guruTargetEl = targetEl.querySelector('.guru-name');
    
    let guruSource = guruSourceEl ? guruSourceEl.innerText.trim() : null;
    let guruTarget = guruTargetEl ? guruTargetEl.innerText.trim() : null;
    
    let hariSource = sourceEl.getAttribute('data-hari');
    let jamSource = parseInt(sourceEl.getAttribute('data-jam'));
    let hariTarget = targetEl.getAttribute('data-hari');
    let jamTarget = parseInt(targetEl.getAttribute('data-jam'));

    // Fungsi Internal: Scan seluruh tabel mencari bentrok
    function cekBentrokDOM(guruName, hariCek, jamCek, abaikanEl) {
        if(!guruName || guruName === "BELUM DISET") return false;
        let konflik = false;
        // Hanya scan tabel KBM
        let semuaCell = document.querySelectorAll(`#tab-hasil .cell-jadwal[data-hari="${hariCek}"][data-jam="${jamCek}"]`);
        semuaCell.forEach(cell => {
            if(cell === abaikanEl) return;
            let gName = cell.querySelector('.guru-name');
            if(gName && gName.innerText.trim() === guruName) {
                konflik = cell.getAttribute('data-kelas'); // Dapatkan nama kelas yang bikin bentrok
            }
        });
        return konflik;
    }

    // 1. Cek Bentrok: Jika Guru Asal dipindah ke titik Target
    let cek1 = cekBentrokDOM(guruSource, hariTarget, jamTarget, targetEl);
    if(cek1) {
        return showAlert(`⛔ DITOLAK! Guru ${guruSource} sudah mengajar di kelas ${cek1} pada ${hariTarget} Jam ke-${jamTarget}.`, "error");
    }

    // 2. Cek Bentrok: Jika Guru Target (yang ditimpa) pindah ke titik Asal
    let cek2 = cekBentrokDOM(guruTarget, hariSource, jamSource, sourceEl);
    if(cek2) {
        return showAlert(`⛔ DITOLAK! Guru ${guruTarget} sudah mengajar di kelas ${cek2} pada ${hariSource} Jam ke-${jamSource}.`, "error");
    }

    // 3. Cek Aturan Batasan Waktu (Izin/Libur Guru)
    if(guruSource && isGuruRestricted(guruSource, hariTarget, jamTarget)) {
        return showAlert(`⛔ DITOLAK! Guru ${guruSource} sedang Izin/Libur pada ${hariTarget} Jam ke-${jamTarget}.`, "warning");
    }
    if(guruTarget && isGuruRestricted(guruTarget, hariSource, jamSource)) {
        return showAlert(`⛔ DITOLAK! Guru ${guruTarget} sedang Izin/Libur pada ${hariSource} Jam ke-${jamSource}.`, "warning");
    }

    // ====================================================
    // JIKA AMAN DARI BENTROK, LAKUKAN PERTUKARAN
    // ====================================================
    
    // 1. Tukar isi Teks (HTML)
    let tempHTML = sourceEl.innerHTML;
    sourceEl.innerHTML = targetEl.innerHTML;
    targetEl.innerHTML = tempHTML;

    // 2. Tukar Kelas CSS (Warna-warni kotaknya)
    let tempClass = sourceEl.className;
    sourceEl.className = targetEl.className;
    targetEl.className = tempClass;
    
    // 3. Tukar Inline Style
    let tempStyle = sourceEl.style.cssText;
    sourceEl.style.cssText = targetEl.style.cssText;
    targetEl.style.cssText = tempStyle;

    showAlert(`Aman! Jadwal kelas ${kelasTarget} berhasil dipindah.`, "success");
}

// ==========================================
// FITUR PENYIMPANAN MULTI-JADWAL
// ==========================================
window.renderSavedSchedules = function() {
    if(!schoolData.savedSchedules) schoolData.savedSchedules = {};
    let keys = Object.keys(schoolData.savedSchedules);
    
    let area = document.getElementById('multiJadwalArea');
    let select = document.getElementById('selectSavedSchedule');
    
    if(keys.length > 0) {
        area.style.display = 'flex';
        let opts = '<option value="">-- Pilih Versi Jadwal --</option>';
        keys.forEach(k => { opts += `<option value="${k}">${k}</option>`; });
        select.innerHTML = opts;
    } else {
        area.style.display = 'none';
    }
}

window.saveCurrentSchedule = function() {
    let areaHTML = document.getElementById('finalOutputArea').innerHTML;
    if(!areaHTML || areaHTML.includes('Klik tombol "Generate"')) {
        return showAlert("Belum ada jadwal yang di-generate!", "warning");
    }
    
    // Tampilkan Custom Modal (bukan prompt bawaan)
    document.getElementById('inputVersionName').value = ''; // Kosongkan input
    document.getElementById('customPromptModal').classList.add('active');
    document.getElementById('inputVersionName').focus();
}

window.closePromptModal = function() {
    document.getElementById('customPromptModal').classList.remove('active');
}

window.confirmSaveSchedule = function() {
    let namaVersi = document.getElementById('inputVersionName').value;
    if(!namaVersi || namaVersi.trim() === "") {
        return showAlert("Nama versi tidak boleh kosong!", "warning");
    }
    
    let areaHTML = document.getElementById('finalOutputArea').innerHTML;
    if(!schoolData.savedSchedules) schoolData.savedSchedules = {};
    
    // Simpan ke memori sementara
    schoolData.savedSchedules[namaVersi] = areaHTML;
    
    closePromptModal();
    renderSavedSchedules();
    showAlert(`Jadwal versi "${namaVersi}" berhasil disimpan!`, "success");
    
    // Panggil saveDraft dengan mode 'silent' agar notif tidak dobel!
    saveDraft(true); 
}

window.loadSavedSchedule = function() {
    let val = document.getElementById('selectSavedSchedule').value;
    if(!val) return showAlert("Pilih versi jadwal terlebih dahulu!", "warning");
    
    // Memunculkan kembali tabel jadwal yang tersimpan
    document.getElementById('finalOutputArea').innerHTML = schoolData.savedSchedules[val];
    document.getElementById('btnSaveSchedule').style.display = 'inline-flex';
    showAlert(`Jadwal versi "${val}" berhasil dimuat!`, "success");
}

window.deleteSavedSchedule = function() {
    let val = document.getElementById('selectSavedSchedule').value;
    if(!val) return showAlert("Pilih versi jadwal terlebih dahulu!", "warning");
    
    // Menggunakan custom confirm modal yang lebih elegan
    showConfirmModal(`Yakin ingin menghapus jadwal versi "${val}"?`, () => {
        delete schoolData.savedSchedules[val];
        renderSavedSchedules();
        showAlert(`Versi "${val}" berhasil dihapus.`, "success");
        saveDraft(true); // silent save
    });
}

// ==========================================
// FITUR DARK MODE
// ==========================================
window.toggleDarkMode = function() {
    let body = document.body;
    let btn = document.getElementById('btnDarkMode');
    
    body.classList.toggle('dark-mode');
    
    if(body.classList.contains('dark-mode')) {
        btn.innerHTML = '☀️ Light Mode';
        localStorage.setItem('themePref', 'dark');
    } else {
        btn.innerHTML = '🌙 Dark Mode';
        localStorage.setItem('themePref', 'light');
    }
}

// Mengecek memori saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
    if(localStorage.getItem('themePref') === 'dark') {
        document.body.classList.add('dark-mode');
        let btn = document.getElementById('btnDarkMode');
        if(btn) btn.innerHTML = '☀️ Light Mode';
    }
});

// ==========================================
// FITUR SIMPAN MANUAL (DASHBOARD MODE)
// ==========================================
window.simpanDataMapel = function() {
    if(!schoolData.mapel || schoolData.mapel.length === 0) {
        return showAlert("Belum ada data Mata Pelajaran yang diinput!", "warning");
    }
    saveDraft(true); // Simpan ke local storage
    showAlert("Data Mapel tersimpan! Silakan lanjut ke menu '3. Data Guru'.", "success");
}

window.simpanDataGuru = function() {
    if(!schoolData.guru || schoolData.guru.length === 0) {
        return showAlert("Belum ada data Guru yang diinput!", "warning");
    }
    
    // INI KUNCI MUNCULNYA NAMA GURU DI DROPDOWN BATASAN WAKTU:
    prepareNextStepData(7); 
    
    saveDraft(true);
    showAlert("Data Guru tersimpan! Daftar nama di form Batasan Waktu telah diperbarui.", "success");
}

// ==========================================
// FITUR PENGUNCIAN MAPEL ABSOLUT
// ==========================================
window.tambahLockMapel = function() {
    let mapel = document.getElementById('lockMapel').value;
    let hari = document.getElementById('lockHari').value;
    let jam = parseInt(document.getElementById('lockJam').value);

    if(!mapel) return showAlert("Pilih mapel terlebih dahulu!", "warning");
    if(!jam || jam < 1) return showAlert("Masukkan jam yang valid!", "warning");

    if(!schoolData.lockMapel) schoolData.lockMapel = [];
    
    // Cek agar tidak dobel
    let indexMapelSama = schoolData.lockMapel.findIndex(l => l.mapel === mapel);
    if(indexMapelSama !== -1) {
        schoolData.lockMapel[indexMapelSama] = { mapel: mapel, hari: hari, jam: jam };
        showAlert(`Penguncian Mapel ${mapel} diperbarui!`, "success");
    } else {
        schoolData.lockMapel.push({ mapel: mapel, hari: hari, jam: jam });
        showAlert(`Mapel ${mapel} berhasil dikunci pada ${hari} Jam ke-${jam}.`, "success");
    }

    renderLockMapel();
    saveDraft(true);
}

window.hapusLockMapel = function(idx) {
    schoolData.lockMapel.splice(idx, 1);
    renderLockMapel();
    saveDraft(true);
}

// ==========================================
// RENDER TABEL BATASAN GURU
// ==========================================
window.renderBatasan = function() {
    let tbody = document.getElementById('bodyBatasan');
    if(!schoolData.batasan || schoolData.batasan.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:#94a3b8; font-weight:normal !important; font-style:normal !important; text-align:center; padding:20px;">Belum ada batasan waktu yang ditambahkan.</td></tr>';
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

// ==========================================
// RENDER TABEL KUNCI MAPEL
// ==========================================
window.renderLockMapel = function() {
    let tbody = document.getElementById('bodyLockMapel');
    if(!tbody) return;
    if(!schoolData.lockMapel || schoolData.lockMapel.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:#94a3b8; font-weight:normal !important; font-style:italic !important; text-align:center; padding:20px;">Belum ada mapel yang dikunci waktunya.</td></tr>';
        return;
    }
    let html = '';
    schoolData.lockMapel.forEach((b, idx) => {
        html += `<tr>
            <td style="font-weight:800; color:var(--dark); text-align:center;">${b.mapel}</td>
            <td style="text-align:center; font-weight:bold; color:var(--primary);">${b.hari}</td>
            <td style="text-align:center;"><span style="background:var(--warning); color:white; padding:4px 10px; border-radius:6px; font-weight:bold; font-size:12px;">Jam ke-${b.jam}</span></td>
            <td style="text-align:center;"><button onclick="hapusLockMapel(${idx})" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">Hapus 🗑️</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ==========================================
// RENDER TABEL FASILITAS TERBATAS
// ==========================================
window.renderFasilitas = function() {
    let tbody = document.getElementById('bodyFasilitas');
    if(!tbody) return;
    if(!schoolData.fasilitas || schoolData.fasilitas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" style="color:#94a3b8; font-weight:normal !important; font-style:italic !important; text-align:center; padding:20px;">Belum ada mapel fasilitas terbatas.</td></tr>';
        return;
    }
    let html = '';
    schoolData.fasilitas.forEach((m, idx) => {
        html += `<tr><td style="font-weight:800; color:var(--dark); text-align:left; padding-left:20px;">${m}</td>
        <td style="text-align:center;"><button onclick="hapusFasilitas(${idx})" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">Hapus 🗑️</button></td></tr>`;
    });
    tbody.innerHTML = html;
}

// ==========================================
// FITUR CETAK KARTU JADWAL INDIVIDU (REVISI LOGO & BORDER)
// ==========================================
window.cetakJadwalIndividu = function(btnElement) {
    let wrapper = btnElement.closest('.jadwal-wrapper');
    
    // Tentukan Label Dinamis
    let labelJudul = "JADWAL PELAJARAN"; 
    if(wrapper.classList.contains('guru-wrapper')) {
        labelJudul = "JADWAL MENGAJAR GURU";
    } else if(window.location.hash.includes('pengawas') || wrapper.innerText.includes('PENGAWAS')) {
        labelJudul = "JADWAL MENGAWAS UJIAN";
    }

    // Hitung Tahun Ajaran Dinamis (2026 -> 2026/2027)
    const thnSekarang = new Date().getFullYear();
    const thnAjaran = `${thnSekarang}/${thnSekarang + 1}`;
    
    let style = document.createElement('style');
    style.id = 'printSingleStyle';
    style.innerHTML = `
        @media print {
            @page { size: landscape; margin: 10mm; }
            body > * { display: none !important; }
            body > .print-container-isolated { 
                display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; 
            }
            .print-container-isolated h3.title-tabel { 
                background: #f1f5f9 !important; color: #000 !important; 
                border: 1.5pt solid #000 !important; 
                padding: 10px !important; font-size: 16px !important; text-align: center; margin-top: 0;
            }
            .print-container-isolated button { display: none !important; }
            
            /* Perbaikan Garis Tabel Agar Tidak Hilang di PDF */
            .print-container-isolated table { 
                border-collapse: collapse !important; 
                width: 100%; 
                margin-top: 5px; 
                border: 1.5pt solid #000 !important; 
            }
            .print-container-isolated th, .print-container-isolated td { 
                border: 1.5pt solid #000 !important; 
                color: #000 !important; 
                background: white !important; 
                padding: 8px !important; 
                font-size: 11px !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .print-container-isolated .kop-surat-isolated * { color: #000 !important; }
        }
    `;
    document.head.appendChild(style);
    
    let clone = wrapper.cloneNode(true);
    clone.classList.add('print-container-isolated');
    clone.style.boxShadow = "none";
    clone.style.border = "none";

    let h3 = clone.querySelector('h3');
    if(h3) h3.classList.add('title-tabel');
    
    let kop = document.createElement('div');
    kop.className = 'kop-surat-isolated';
    kop.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 4px solid #000; padding: 0 60px 10px 60px; margin-bottom: 15px;">
            <img src="logo2.png" style="width: 85px; height: 85px; object-fit: contain;">
            <div style="text-align: center; flex: 1; padding: 0 20px;">
                <h3 style="margin: 0; font-size: 20px; color: #000 !important; font-family: 'Times New Roman', serif; font-weight: bold; background: none !important; border: none !important; padding: 0 !important; letter-spacing:1px;">${labelJudul}</h3>
                <h2 style="margin: 3px 0; font-size: 26px; color: #000 !important; font-weight: 900; font-family: 'Times New Roman', serif;">PONDOK PESANTREN HUSNUL KHOTIMAH</h2>
                <p style="margin: 0; font-size: 16px; color: #000 !important; font-family: 'Times New Roman', serif; font-weight: bold;">Tahun Ajaran ${thnAjaran}</p>
            </div>
            <img src="logo1.png" style="width: 85px; height: 85px; object-fit: contain; border-radius: 50%;">
        </div>
    `;
    clone.insertBefore(kop, clone.firstChild);
    
    document.body.appendChild(clone);
    window.print();
    
    clone.remove();
    style.remove();
}

// ==========================================
// FITUR FASILITAS TERBATAS (BARU DITAMBAHKAN)
// ==========================================
window.tambahFasilitas = function() {
    let mapel = document.getElementById('fasilitasMapel').value;
    if(!mapel) return showAlert("Pilih mapel terlebih dahulu!", "warning");
    
    if(!schoolData.fasilitas) schoolData.fasilitas = [];
    
    // Cek agar tidak memasukkan mapel yang sama dua kali
    if(schoolData.fasilitas.includes(mapel)) {
        return showAlert(`Mapel ${mapel} sudah ada di daftar fasilitas!`, "warning");
    }
    
    schoolData.fasilitas.push(mapel);
    renderFasilitas();
    saveDraft(true);
    showAlert(`Mapel ${mapel} ditambahkan sebagai fasilitas terbatas.`, "success");
}

window.hapusFasilitas = function(idx) {
    schoolData.fasilitas.splice(idx, 1);
    renderFasilitas();
    saveDraft(true);
}