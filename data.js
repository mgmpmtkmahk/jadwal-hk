// ==========================================
// VARIABEL GLOBAL & STATE APLIKASI
// ==========================================
let currentStep = 1;
let schoolData = { tingkat: [], jurusan: {}, paralel: {}, split: {}, mapel: [], guru: [], batasan: [] };
let confirmCallback = null;

// ==========================================
// FUNGSI MANAJEMEN DATA (SAVE, LOAD, BACKUP)
// ==========================================
function saveDraft(silent = false) { 
    localStorage.setItem('wizardData', JSON.stringify(schoolData)); 
    if(!silent) {
        showAlert("Data berhasil disave ke memori!", "success"); 
    }
}

function loadDraft(silent = false) {
    const d = localStorage.getItem('wizardData');
    if(d) {
        schoolData = JSON.parse(d);
        if(!schoolData.batasan) schoolData.batasan = [];
        repopulateUI();
        if(!silent) showAlert("Data berhasil di-load!", "success");
    } else {
        if(!silent) showAlert("Tidak ada data tersimpan.", "warning");
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

function cleanDraft() { 
    showConfirmModal("Anda yakin ingin menghapus semua form dan tabel? Halaman akan di-refresh.", () => { 
        localStorage.clear(); location.reload(); 
    }); 
}

function downloadExcelCSV(content, name) { 
    const l=document.createElement("a"); 
    l.href=URL.createObjectURL(new Blob(["\uFEFF"+content], {type:'text/csv;charset=utf-8;'})); 
    l.download=name; document.body.appendChild(l); l.click(); l.remove(); 
}