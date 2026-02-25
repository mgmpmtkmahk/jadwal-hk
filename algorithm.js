// ==========================================
// ALGORITMA 1: AUTO-DISTRIBUSI GURU
// ==========================================
const DEBUG_ALGO = false;

window.autoDistribusiGuru = function() {
    if(!schoolData.mapel || schoolData.mapel.length === 0) {
        return showAlert("Data Mapel (Menu 2) masih kosong!", "error");
    }
    if(!schoolData.guru || schoolData.guru.length === 0) {
        return showAlert("Upload daftar Guru (Menu 3) terlebih dahulu!", "error");
    }
    if(!schoolData.split || Object.keys(schoolData.split).length === 0) {
        return showAlert("Silakan klik 'PROSES FORM ROMBEL' di Menu 1 terlebih dahulu!", "warning");
    }

    // 1. Bersihkan seluruh rincian guru sebelum dihitung ulang
    schoolData.guru.forEach(g => {
        g.rincian = {}; 
        g.total = 0;
    });

    let kebutuhan = {};
    
    // 2. Hitung kebutuhan dengan pengaman Anti-Typo
    schoolData.mapel.forEach(m => {
        let mName = m.mapel.toString().trim().toUpperCase(); 
        let mKelas = m.kelas.toString().trim().toUpperCase();

        if(!kebutuhan[mName]) kebutuhan[mName] = {};
        if(!kebutuhan[mName][mKelas]) kebutuhan[mName][mKelas] = { PA: 0, PI: 0 };

        let totalRombelPA = 0;
        let totalRombelPI = 0;

        for(let key in schoolData.split) {
            let prefix = key.replace('-Tidak Ada', '').trim().toUpperCase(); 
            if(prefix === mKelas) {
                totalRombelPA += parseInt(schoolData.split[key].pa) || 0;
                totalRombelPI += parseInt(schoolData.split[key].pi) || 0;
            }
        }

        kebutuhan[mName][mKelas].PA += (parseInt(m.jp) * totalRombelPA);
        kebutuhan[mName][mKelas].PI += (parseInt(m.jp) * totalRombelPI);
    });

    // 3. Distribusikan ke Guru secara adil
    for(let mapel in kebutuhan) {
        for(let kelas in kebutuhan[mapel]) {
            let butuhPA = kebutuhan[mapel][kelas].PA;
            let butuhPI = kebutuhan[mapel][kelas].PI;
            
            // Mengambil nama kelas asli untuk ditampilkan di tabel
            let originalKelas = schoolData.mapel.find(m => m.kelas.toString().trim().toUpperCase() === kelas).kelas;

            // Memfilter guru dengan mengabaikan huruf besar/kecil dan spasi berlebih
            let guruCocok = schoolData.guru.filter(g => {
                return g.mapelsArr.some(x => x.toString().trim().toUpperCase() === mapel);
            });

            let guruPA = guruCocok.filter(g => g.target === 'PA');
            let guruPI = guruCocok.filter(g => g.target === 'PI');
            let guruBebas = guruCocok.filter(g => g.target === 'BEBAS');

            // Fungsi pembantu untuk membagi angka JP ke beberapa guru
            const bagiRata = (listGuru, totalButuh) => {
                if(listGuru.length === 0 || totalButuh <= 0) return totalButuh;
                let avg = Math.floor(totalButuh / listGuru.length);
                let sisa = totalButuh % listGuru.length;
                listGuru.forEach((g, i) => { 
                    let assigned = avg + (i < sisa ? 1 : 0);
                    g.rincian[originalKelas] = (g.rincian[originalKelas]||0) + assigned; 
                    g.total += assigned; 
                });
                return 0; 
            };

            butuhPA = bagiRata(guruPA, butuhPA);
            butuhPI = bagiRata(guruPI, butuhPI);
            bagiRata(guruBebas, butuhPA + butuhPI);
        }
    }

    renderTabelGuru();
    saveDraft(true); // Paksa simpan ke memori agar angkanya tidak hilang
    showAlert("Distribusi JP Ideal berhasil dihitung!", "success");
}

// ==========================================
// EXPORT TO EXCEL
// ==========================================
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

// ==========================================
// PUSAT KONTROL GENERATOR
// ==========================================
window.jalankanGenerator = function() {
    document.getElementById('loadingOverlay').classList.add('active');
    
    // Memberi jeda sedikit agar animasi loading muncul dulu sebelum browser "berpikir" keras
    setTimeout(() => {
        const mode = document.getElementById('modeJadwal').value;
        const algoPilihan = document.getElementById('algoKBM').value;

        if (mode === 'PTS' || mode === 'PAS') {
            // Ujian tetap pakai logika dasar yang sudah ada (karena beda mekanisme)
            eksekusiAlgoritmaJadwal('monte_carlo'); 
        } else {
            // Mode KBM akan diarahkan ke algoritma yang dipilih
            eksekusiAlgoritmaJadwal(algoPilihan);
        }
        
        document.getElementById('loadingOverlay').classList.remove('active');
    }, 100);
}

function eksekusiAlgoritmaJadwal(tipeAlgoritma) {
    
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

    // ===============================================
    // CABANG 1: MODE PTS & PAS/PAT 
    // ===============================================
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
                <button id="btnSaveSchedule" class="btn-sm btn-save" style="margin-left: auto; height: 45px;" onclick="saveCurrentSchedule()">💾 Simpan Hasil Jadwal Ini</button>
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
    // CABANG 2: KBM (REGULER) - GENERATOR ENGINE
    // ===============================================
    let baseTugasSatuan = [];
    semuaKelasFisikObj.forEach(kf => {
        for(let m in pemetaanTugas[kf.id]) { 
            let info = pemetaanTugas[kf.id][m];
            let jp_sisa = info.jp;
            while(jp_sisa >= 2) { baseTugasSatuan.push({ kelasId: kf.id, mapel: m, guru: info.guru, durasi: 2 }); jp_sisa -= 2; }
            if(jp_sisa === 1) { baseTugasSatuan.push({ kelasId: kf.id, mapel: m, guru: info.guru, durasi: 1 }); }
        }
    });

    // --- FUNGSI HELPER: Mencoba memasukkan 1 set urutan tugas ke dalam jadwal ---
    function buildSchedule(taskOrder) {
        let tempJadwalKelas = {}; let tempJadwalGuru = {}; 
        let tempLog = []; let tempUnplaced = [];
        
        semuaKelasFisikObj.forEach(kf => {
            tempJadwalKelas[kf.id] = {};
            namaHari.forEach(h => { tempJadwalKelas[kf.id][h] = {}; for(let j=1; j<=limitSesi; j++) tempJadwalKelas[kf.id][h][j] = null; });
        });

        taskOrder.forEach(tugas => {
            let berhasilPlot = false;
            if(tugas.guru === "BELUM DISET") {
                tempLog.push({ kelas: tugas.kelasId, mapel: tugas.mapel, butuh: "Blok " + tugas.durasi + " JP", alasan: `Guru untuk kelas dan mapel ini TIDAK DITEMUKAN.` });
                return; 
            }
            if(!tempJadwalGuru[tugas.guru]) { 
                tempJadwalGuru[tugas.guru] = {}; namaHari.forEach(h => tempJadwalGuru[tugas.guru][h] = {}); 
            }
            
            // FITUR KUNCI MAPEL
            let lockedData = null;
            if(schoolData.lockMapel) {
                lockedData = schoolData.lockMapel.find(l => l.mapel === tugas.mapel);
            }
            let hariAcak = [...namaHari].sort(() => Math.random() - 0.5);
            if(lockedData && namaHari.includes(lockedData.hari)) {
                hariAcak = [lockedData.hari]; // Paksa A.I. HANYA mencoba di hari tersebut
            }

            for(let loopAman=0; loopAman<2; loopAman++) {
                if(berhasilPlot) break;
                for(let h=0; h<hariAcak.length && !berhasilPlot; h++) {
                    let hari = hariAcak[h]; 
                    if(loopAman === 0) { 
                        let sudahAda = false;
                        for(let k=1; k<=limitSesi; k++) { if(tempJadwalKelas[tugas.kelasId][hari][k] && tempJadwalKelas[tugas.kelasId][hari][k].mapel === tugas.mapel) sudahAda = true; }
                        if(sudahAda && !lockedData) continue; // Abaikan aturan ini khusus untuk mapel yang dikunci paksa
                    }
                    
                    let sesiAcak = []; for(let j=1; j <= limitSesi - tugas.durasi + 1; j++) sesiAcak.push(j);
                    sesiAcak.sort(() => Math.random() - 0.5);

                    if(lockedData && lockedData.jam) {
                        if(lockedData.jam <= limitSesi - tugas.durasi + 1) {
                            sesiAcak = [lockedData.jam]; // Paksa A.I. HANYA menaruh di jam tersebut
                        } else {
                            sesiAcak = []; // Menghindari error jika jam terkunci melampaui batas hari
                        }
                    }

                    // --- BARIS PENCARIAN SESI YANG SEBELUMNYA HILANG ---
                    for(let x=0; x<sesiAcak.length && !berhasilPlot; x++) {
                        let j = sesiAcak[x]; let aman = true;

                        for(let d=0; d<tugas.durasi; d++) {
                            let cSesi = j + d;
                            // 1. Cek Bentrok Guru / Jadwal Izin
                            if(tempJadwalKelas[tugas.kelasId][hari][cSesi] !== null || tempJadwalGuru[tugas.guru][hari][cSesi] || isGuruRestricted(tugas.guru, hari, cSesi)) { aman = false; break; }
                            
                            // 2. CEK FASILITAS TERBATAS (LAB/LAPANGAN)
                            if(schoolData.fasilitas && schoolData.fasilitas.includes(tugas.mapel)) {
                                for(let otherKelas in tempJadwalKelas) {
                                    if(otherKelas !== tugas.kelasId && tempJadwalKelas[otherKelas][hari][cSesi] && tempJadwalKelas[otherKelas][hari][cSesi].mapel === tugas.mapel) { 
                                        aman = false; break; 
                                    }
                                }
                            }
                            if(!aman) break;
                        }

                        if(aman) {
                            for(let d=0; d<tugas.durasi; d++) {
                                tempJadwalKelas[tugas.kelasId][hari][j+d] = { mapel: tugas.mapel, guru: tugas.guru };
                                tempJadwalGuru[tugas.guru][hari][j+d] = { kelas: tugas.kelasId, mapel: tugas.mapel }; 
                            }
                            berhasilPlot = true;
                        }
                    } // Penutup loop pencarian sesi (x)
                } // Penutup loop hari (h)
            } // Penutup loopAman
            if(!berhasilPlot) tempUnplaced.push({ tugas: tugas, logMsg: `Kepadatan jadwal tinggi. Ruang/Waktu guru <b>${tugas.guru}</b> bentrok.` });
        });
        
        let errors = logPemetaanAwal.length + tempLog.length + tempUnplaced.length;
        return { jadwalKelas: tempJadwalKelas, jadwalGuru: tempJadwalGuru, unplaced: tempUnplaced, log: tempLog, errors: errors };
    }

    let bestResult = null;
    let minErrors = Infinity;

    // ===============================================
    // ROUTING ALGORITMA BERDASARKAN PILIHAN USER
    // ===============================================
    if (tipeAlgoritma === 'genetic') {
        // --- 🧬 3. ALGORITMA GENETIKA (Order-Based GA) ---
        const POP_SIZE = 20; 
        const GENERATIONS = 30; // Total 600 evaluasi, performa mirip Monte Carlo
        let population = [];

        // 1. Inisialisasi Populasi Awal (Bikin 20 jadwal acak)
        for(let i=0; i<POP_SIZE; i++) {
            let shuffled = [...baseTugasSatuan].sort(() => Math.random() - 0.5);
            let res = buildSchedule(shuffled);
            population.push({ chromosome: shuffled, result: res, fitness: res.errors });
        }

        // 2. Evolusi selama beberapa Generasi
        for(let gen=0; gen<GENERATIONS; gen++) {
            // Urutkan berdasarkan fitness (error paling sedikit di atas)
            population.sort((a, b) => a.fitness - b.fitness);
            
            // Simpan yang terbaik sejauh ini
            if(population[0].fitness < minErrors) { minErrors = population[0].fitness; bestResult = population[0].result; }
            if(minErrors === 0) break; // Sempurna, hentikan evolusi!

            let newPopulation = [];
            // Elitism: 2 jadwal terbaik langsung lolos ke generasi berikutnya tanpa diubah
            newPopulation.push(population[0], population[1]);

            // Crossover & Mutasi untuk sisa populasi
            while(newPopulation.length < POP_SIZE) {
                // Pilih 2 Induk secara acak dari separuh populasi terbaik (Tournament Selection sederhana)
                let parent1 = population[Math.floor(Math.random() * (POP_SIZE/2))].chromosome;
                let parent2 = population[Math.floor(Math.random() * (POP_SIZE/2))].chromosome;

                // Crossover: Ambil separuh urutan dari P1, sisanya diisi dari P2
                let splitPoint = Math.floor(parent1.length / 2);
                let childOrder = parent1.slice(0, splitPoint);
                
                // Masukkan sisa tugas dari P2 yang belum ada di childOrder
                parent2.forEach(task => { if(!childOrder.includes(task)) childOrder.push(task); });

                // Mutasi: 10% peluang menukar 2 tugas secara acak (menciptakan variasi)
                if(Math.random() < 0.10) {
                    let idx1 = Math.floor(Math.random() * childOrder.length);
                    let idx2 = Math.floor(Math.random() * childOrder.length);
                    let temp = childOrder[idx1]; childOrder[idx1] = childOrder[idx2]; childOrder[idx2] = temp;
                }

                // Evaluasi anak yang baru lahir
                let childRes = buildSchedule(childOrder);
                newPopulation.push({ chromosome: childOrder, result: childRes, fitness: childRes.errors });
            }
            population = newPopulation;
        }
        if (DEBUG_ALGO) console.log(`GA Selesai. Error Terkecil: ${minErrors}`);

    } else {
        // --- 🎲 1 & 2. MONTE CARLO DASAR / LOCAL SEARCH ---
        const MAX_ITERATIONS = 500;
        for(let i = 0; i < MAX_ITERATIONS; i++) {
            let shuffled = [...baseTugasSatuan].sort(() => Math.random() - 0.5);
            let res = buildSchedule(shuffled);
            
            if(res.errors < minErrors) { minErrors = res.errors; bestResult = res; }
            if(minErrors === 0) break;
        }
    }

    // ===============================================
    // FITUR TAMBAHAN: LOCAL SEARCH (SWAPPING) 🔄
    // (Bisa berlaku untuk Monte Carlo maupun Genetika jika masih ada error)
    // ===============================================
    if ((tipeAlgoritma === 'local_search' || tipeAlgoritma === 'genetic') && bestResult.unplaced.length > 0) {
        let swappedCount = 0;
        let finalUnplacedTasks = [];

        bestResult.unplaced.forEach(unplaced => {
            let berhasilSwap = false; let t = unplaced.tugas;

            // CEK 1: Jangan swap jika mapel yang belum terplot adalah mapel terkunci!
            if(schoolData.lockMapel && schoolData.lockMapel.find(l => l.mapel === t.mapel)) {
                finalUnplacedTasks.push(unplaced);
                return; // Lewati mapel sakti ini
            }

            for (let h of namaHari) {
                if(berhasilSwap) break;
                for (let j = 1; j <= limitSesi - t.durasi + 1; j++) {
                    if(berhasilSwap) break;

                    let guruAAman = true;
                    for(let d=0; d<t.durasi; d++) { if(bestResult.jadwalGuru[t.guru][h][j+d] || isGuruRestricted(t.guru, h, j+d)) guruAAman = false; }
                    if(!guruAAman) continue;

                    let conflictTasks = [];
                    for(let d=0; d<t.durasi; d++) {
                        let occ = bestResult.jadwalKelas[t.kelasId][h][j+d];
                        if(occ && !conflictTasks.includes(occ)) conflictTasks.push(occ);
                    }

                    if(conflictTasks.length === 1) {
                        let taskB = conflictTasks[0];
                        // CEK 2: Jangan usir mapel B dari tempatnya jika dia adalah mapel yang dikunci!
                        let isTargetLocked = schoolData.lockMapel && schoolData.lockMapel.find(l => l.mapel === taskB.mapel);
                        if(isTargetLocked) continue;
                        let bDurasi = 0; let bStart = -1;
                        for(let k=1; k<=limitSesi; k++) {
                            let occ = bestResult.jadwalKelas[t.kelasId][h][k];
                            if(occ && occ.mapel === taskB.mapel && occ.guru === taskB.guru) { if(bStart===-1) bStart = k; bDurasi++; }
                        }

                        if(bDurasi === t.durasi && bStart === j) {
                            for(let h2 of namaHari) {
                                if(berhasilSwap) break;
                                for(let j2 = 1; j2 <= limitSesi - bDurasi + 1; j2++) {
                                    let bAman = true;
                                    for(let d=0; d<bDurasi; d++) {
                                        if (bestResult.jadwalKelas[t.kelasId][h2][j2+d] || bestResult.jadwalGuru[taskB.guru][h2][j2+d] || isGuruRestricted(taskB.guru, h2, j2+d)) { bAman = false; break; }
                                    }
                                    
                                    if(bAman) {
                                        for(let d=0; d<bDurasi; d++) { bestResult.jadwalKelas[t.kelasId][h][j+d] = null; bestResult.jadwalGuru[taskB.guru][h][j+d] = null; }
                                        for(let d=0; d<bDurasi; d++) {
                                            bestResult.jadwalKelas[t.kelasId][h2][j2+d] = { mapel: taskB.mapel, guru: taskB.guru };
                                            bestResult.jadwalGuru[taskB.guru][h2][j2+d] = { kelas: t.kelasId, mapel: taskB.mapel };
                                        }
                                        for(let d=0; d<t.durasi; d++) {
                                            bestResult.jadwalKelas[t.kelasId][h][j+d] = { mapel: t.mapel, guru: t.guru };
                                            bestResult.jadwalGuru[t.guru][h][j+d] = { kelas: t.kelasId, mapel: t.mapel };
                                        }
                                        berhasilSwap = true; swappedCount++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if(!berhasilSwap) finalUnplacedTasks.push(unplaced);
        });

        // Rekonstruksi Log Akhir setelah Swap
        bestResult.log = [...logPemetaanAwal];
        finalUnplacedTasks.forEach(u => {
            bestResult.log.push({ kelas: u.tugas.kelasId, mapel: u.tugas.mapel, butuh: "Blok " + u.tugas.durasi + " JP", alasan: u.logMsg });
        });
        if (swappedCount > 0 && DEBUG_ALGO) console.log(`Local Search memperbaiki ${swappedCount} jadwal!`);
    } else {
        bestResult.log = [...logPemetaanAwal];
        bestResult.unplaced.forEach(u => {
            bestResult.log.push({ kelas: u.tugas.kelasId, mapel: u.tugas.mapel, butuh: "Blok " + u.tugas.durasi + " JP", alasan: u.logMsg });
        });
    }

    let jadwalKelas = bestResult.jadwalKelas;
    let jadwalGuru = bestResult.jadwalGuru;
    let logValidasi = bestResult.log;

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

    semuaKelasFisikObj.forEach(kf => {
        htmlHasil += `<div class="jadwal-wrapper" data-group="${kf.group}">
                        <h3 style="display:flex; justify-content:space-between; align-items:center; padding-right:15px;">
                            <span><span style="font-size:22px;">🪧</span> Kelas: ${kf.id}</span>
                            <button onclick="cetakJadwalIndividu(this)" class="btn-sm" style="height:32px; background:white; color:var(--primary); border:none; box-shadow:0 2px 4px rgba(0,0,0,0.1); margin:0;">🖨️ Cetak Kelas Ini</button>
                        </h3>
                            <table>
                                <tr><th width="100" style="text-align:center;">Jam Ke-</th>`;
        namaHari.forEach(h => htmlHasil += `<th style="text-align:center;">${h}</th>`);
        htmlHasil += `</tr>`;
        for(let j=1; j<=limitSesi; j++) {
            htmlHasil += `<tr><td style="text-align:center;"><strong>Jam ${j}</strong></td>`;
            namaHari.forEach(h => {
                let slot = jadwalKelas[kf.id][h][j];
                // Buat ID unik untuk setiap kotak agar mudah dicari saat digeser
                let safeId = kf.id.replace(/[^a-zA-Z0-9]/g, '_'); 
                let cellId = `cell_${safeId}_${h.replace(/\s/g, '')}_${j}`;

                if(slot) {
                    let classExtra = slot.guru === "BELUM DISET" ? "cell-kosong" : "";
                    htmlHasil += `<td id="${cellId}" class="cell-jadwal ${classExtra}" draggable="true" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dropCell(event, '${kf.id}')" data-hari="${h}" data-jam="${j}" data-kelas="${kf.id}">
                        <div class="mapel-name">${slot.mapel}</div>
                        <div class="guru-name">${slot.guru}</div>
                    </td>`;
                } else {
                    htmlHasil += `<td id="${cellId}" class="cell-jadwal" style="color:#94a3b8; background:#f8fafc;" draggable="true" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dropCell(event, '${kf.id}')" data-hari="${h}" data-jam="${j}" data-kelas="${kf.id}">
                        -
                    </td>`;
                }
            });
            htmlHasil += `</tr>`;
        }
        htmlHasil += `</table></div>`;
    });

    let htmlGuru = `<div class="dynamic-row" style="margin-bottom:15px; background: white; border-left-color: var(--secondary);"><label style="font-weight:800;">Filter Guru:</label><select id="filterCetakGuru" style="flex:1; padding: 10px;" onchange="terapkanFilterGuru()"><option value="all">Tampilkan Semua Guru</option>`;
    let sortedGuruKBM = Object.keys(jadwalGuru).sort();
    sortedGuruKBM.forEach(g => { htmlGuru += `<option value="${g}">${g}</option>`; });
    htmlGuru += `</select>
                 <button onclick="exportToExcel('GURU', 'Jadwal_Guru_Mengajar')" class="btn-action btn-export" style="margin-left:15px; width:auto; height: 40px; border-radius:6px; background: var(--success);">⬇️ EXCEL</button>
                 <button onclick="window.print()" class="btn-action btn-export" style="margin-left:10px; width:auto; height: 40px; border-radius:6px; background: var(--dark);">🖨️ PRINT JADWAL GURU</button></div>`;

    sortedGuruKBM.forEach(guruName => {
        htmlGuru += `<div class="jadwal-wrapper guru-wrapper" data-guru="${guruName}">
                        <h3 style="color: white; background: var(--secondary); display:flex; justify-content:space-between; align-items:center; padding-right:15px;">
                            <span><span style="font-size:22px;">👨‍🏫</span> Jadwal Mengajar: ${guruName}</span>
                            <button onclick="cetakJadwalIndividu(this)" class="btn-sm" style="height:32px; background:var(--dark); color:white; border:none; box-shadow:0 2px 4px rgba(0,0,0,0.2); margin:0;">🖨️ Cetak Kartu Guru</button>
                        </h3>
                            <table>
                                <tr><th width="100" style="text-align:center; background: #eaf2f8; color: var(--secondary);">Jam Ke-</th>`;
        namaHari.forEach(h => htmlGuru += `<th style="text-align:center; background: #eaf2f8; color: var(--secondary);">${h}</th>`);
        htmlGuru += `</tr>`;
        for(let j=1; j<=limitSesi; j++) {
            htmlGuru += `<tr><td style="text-align:center;"><strong>Jam ${j}</strong></td>`;
            namaHari.forEach(h => {
                let slot = jadwalGuru[guruName][h][j];
                if(slot) { htmlGuru += `<td class="cell-jadwal">
                    <div class="mapel-name">${slot.kelas}</div>
                    <div class="guru-name">${slot.mapel}</div>
                </td>`;
                } else htmlGuru += `<td class="cell-jadwal" style="color:#94a3b8; background:#f8fafc;">-</td>`;
            });
            htmlGuru += `</tr>`;
        }
        htmlGuru += `</table></div>`;
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
        htmlValidasi += `<div style="text-align:center; padding:40px; color:var(--success); background:white; border-radius:8px; border:2px dashed var(--success);">
                            <h3 style="margin-top:0; font-size:24px;">✅ Sempurna (0 Error)</h3>
                            <p style="font-weight:600; color:#475569;">Berhasil menemukan kombinasi terbaik. Semua mapel ter-plot tanpa bentrok!</p>
                         </div>`;
    }

    // === 1. MENGHITUNG DATA STATISTIK ===
    let totalJPHitung = baseTugasSatuan.reduce((sum, t) => sum + t.durasi, 0);
    let guruAktif = new Set();
    baseTugasSatuan.forEach(t => { if(t.guru !== "BELUM DISET") guruAktif.add(t.guru); });
    let totalGuruAktif = guruAktif.size;
    let totalKelasHitung = semuaKelasFisikObj.length;

    // === 2. MEMBUAT KARTU DASHBOARD ===
    let htmlDashboard = `
        <div class="dashboard-grid">
            <div class="stat-card c-blue">
                <div class="stat-icon">🏫</div>
                <div class="stat-info">
                    <h4>Total Rombel</h4>
                    <div class="stat-val">${totalKelasHitung}</div>
                </div>
            </div>
            <div class="stat-card c-purple">
                <div class="stat-icon">👨‍🏫</div>
                <div class="stat-info">
                    <h4>Guru Mengajar</h4>
                    <div class="stat-val">${totalGuruAktif}</div>
                </div>
            </div>
            <div class="stat-card c-green">
                <div class="stat-icon">📚</div>
                <div class="stat-info">
                    <h4>Total Jam (JP)</h4>
                    <div class="stat-val">${totalJPHitung}</div>
                </div>
            </div>
            <div class="stat-card c-red">
                <div class="stat-icon">⚠️</div>
                <div class="stat-info">
                    <h4>Sesi Kosong</h4>
                    <div class="stat-val">${totalSesiKosong}</div>
                </div>
            </div>
        </div>
    `;

    // === FITUR BARU: TABEL REKAP TOTAL JP & RINCIAN JENJANG ===
    let htmlRekap = `<div class="dynamic-row" style="background: #f8fafc; border-left-color: var(--success); margin-bottom: 15px;">
                        <label style="width:auto; flex:1; font-weight:800; color:var(--dark);">💡 Rekapitulasi Beban Mengajar Guru (Total JP & Rincian).</label>
                        <button onclick="exportToExcel('ALL', 'Rekap_Beban_Mengajar')" class="btn-action btn-export" style="margin-left:15px; width:auto; height: 40px; border-radius:6px; background: var(--success);">⬇️ EXCEL (.xlsx)</button>
                        <button onclick="window.print()" class="btn-action btn-export" style="margin-left:10px; width:auto; height: 40px; border-radius:6px; background: var(--dark);">🖨️ PRINT LAPORAN</button>
                     </div>
                     <div class="print-page jadwal-wrapper" style="background:white; padding: 20px;">
                        <h2 style="text-align:center; margin-bottom:20px; color:var(--dark);">REKAPITULASI BEBAN MENGAJAR GURU<br><span style="font-size:14px; color:#64748b; font-weight:600;">(Berdasarkan Hasil Generate A.I)</span></h2>
                        <table class="compact-table" style="width: 100%;">
                            <tr>
                                <th width="50" style="text-align:center;">No</th>
                                <th style="text-align:left; width: 25%;">Nama Guru</th>
                                <th style="text-align:left; width: 25%;">Mata Pelajaran</th>
                                <th style="text-align:left;">Kelas / Tingkat</th>
                                <th width="100" style="text-align:center;">Total JP</th>
                            </tr>`;
    
    let noUrut = 1;
    let grandTotalJP = 0;
    sortedGuruKBM.forEach(gName => {
        let realJP = 0;
        let rincianMapel = {}; 
        
        namaHari.forEach(h => {
            for(let j=1; j<=limitSesi; j++) { 
                let slot = jadwalGuru[gName][h][j];
                if(slot) { 
                    realJP++; 
                    let mapel = slot.mapel;
                    let tingkat = slot.kelas.split(' ')[0]; 
                    if(!rincianMapel[mapel]) rincianMapel[mapel] = {};
                    if(!rincianMapel[mapel][tingkat]) rincianMapel[mapel][tingkat] = 0;
                    rincianMapel[mapel][tingkat]++;
                } 
            }
        });
        
        let mapelHTML = "";
        let kelasHTML = "";
        if(realJP > 0) {
            for(let m in rincianMapel) {
                let detailTingkat = [];
                for(let t in rincianMapel[m]) detailTingkat.push(`${t} (${rincianMapel[m][t]} JP)`);
                
                mapelHTML += `<div style="margin-bottom:8px; font-weight:700; color:var(--dark);">${m}</div>`;
                kelasHTML += `<div style="margin-bottom:8px; color:#475569;">${detailTingkat.join(' | ')}</div>`;
            }
        } else {
            mapelHTML = `<span style="color:#94a3b8; font-style:italic;">-</span>`;
            kelasHTML = `<span style="color:#94a3b8; font-style:italic;">Tidak ada jam mengajar</span>`;
        }

        htmlRekap += `<tr>
                        <td style="text-align:center; vertical-align:top; padding-top:15px;">${noUrut++}</td>
                        <td style="text-align:left; font-weight:bold; color:var(--primary); vertical-align:top; padding-top:15px;">${gName}</td>
                        <td style="text-align:left; vertical-align:top; padding-top:15px;">${mapelHTML}</td>
                        <td style="text-align:left; vertical-align:top; padding-top:15px;">${kelasHTML}</td>
                        <td style="text-align:center; font-weight:900; font-size:18px; color:var(--dark); vertical-align:top; padding-top:15px;">${realJP}</td>
                     </tr>`;
        grandTotalJP += realJP;
    });
    
    htmlRekap += `<tr style="background:#f1f5f9;">
                    <td colspan="4" style="text-align:right; font-weight:900; color:var(--dark);">TOTAL KESELURUHAN JP:</td>
                    <td style="text-align:center; font-weight:900; font-size:18px; color:var(--primary);">${grandTotalJP}</td>
                 </tr>
                 </table>
                 </div>`;

    // === 3. MENGGABUNGKAN SEMUANYA ===
    let outputHTML = `
        ${htmlDashboard}
        <div class="tabs">
            <button class="tab-btn active" id="btn-tab-hasil" onclick="switchTab('tab-hasil')">📅 Jadwal Kelas</button>
            <button class="tab-btn" id="btn-tab-guru" onclick="switchTab('tab-guru')">👨‍🏫 Jadwal Guru</button>
            <button class="tab-btn" id="btn-tab-rekap" onclick="switchTab('tab-rekap')">📊 Rekap JP</button>
            <button class="tab-btn" id="btn-tab-analisis" onclick="switchTab('tab-analisis')">⚠️ Log Analisis ${logValidasi.length > 0 ? `<span class="badge">${logValidasi.length}</span>` : ''}</button>
            <button id="btnSaveSchedule" class="btn-sm btn-save" style="margin-left: auto; height: 45px;" onclick="saveCurrentSchedule()">💾 Simpan Hasil Jadwal Ini</button>
        </div>
        <div id="tab-hasil" class="tab-content active">${htmlHasil}</div>
        <div id="tab-guru" class="tab-content">${htmlGuru}</div>
        <div id="tab-rekap" class="tab-content">${htmlRekap}</div>
        <div id="tab-analisis" class="tab-content">${htmlValidasi}</div>
    `;

    document.getElementById('finalOutputArea').innerHTML = outputHTML;
    showAlert("Jadwal KBM Berhasil Di-generate!", "success");
    if(logValidasi.length > 0) window.scrollTo({ top: document.getElementById('finalOutputArea').offsetTop - 50, behavior: 'smooth' });
}