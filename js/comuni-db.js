let db = null;

/**
 * Inizializza il database dei comuni e precarica le province
 */
async function initDatabase() {
    const overlay = document.getElementById('loading-overlay');

    try {
        // 1. Carica WASM e DB
        const sqlPromise = initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
        });
        const dataPromise = fetch("./resources/comuni.db").then(res => res.arrayBuffer());

        const [SQL, buf] = await Promise.all([sqlPromise, dataPromise]);
        
        // 2. Inizializza DB
        db = new SQL.Database(new Uint8Array(buf));
        console.log("Database SQLite pronto!");

        // 3. Popola subito la prima select (Province)
        populateProvince();
        
        // 4. FINE: Nascondi spinner e mostra il sito
        overlay.style.display = 'none';

    } catch (err) {
        console.error("Errore durante il caricamento:", err);
        overlay.innerHTML = "<p style='color:red'>Errore nel caricamento dei dati. Ricarica la pagina.</p>";
    }
}

function _listaProvince() {
    if (!db) return;

    const stmt = db.prepare("SELECT sigla, nome_provincia FROM province ORDER BY nome_provincia ASC");
    const province = [];
    while (stmt.step()) {
        province.push(stmt.getAsObject());
    }
    stmt.free();
    
    return province;

}

//Recupera comuni dopo aver scelto la provincia
function _listaComuniByProvincia(sigla) {
    if (!db) return;

    const stmt = db.prepare("SELECT distinct nome_comune FROM comuni_cap WHERE sigla_prov = :sigla ORDER BY nome_comune ASC");
    stmt.bind({":sigla": sigla});

    const comuni = [];
    while (stmt.step()) {
        comuni.push(stmt.getAsObject());
    }
    stmt.free();
    
    return comuni;
}

//Recupera comuni dopo aver scelto la provincia
function _listaCapByComune(comune) {
    if (!db) return;

    const stmt = db.prepare("SELECT distinct cap FROM comuni_cap WHERE nome_comune = :comune ORDER BY cap ASC");
    stmt.bind({":comune": comune});

    const cap = [];
    while (stmt.step()) {
        cap.push(stmt.getAsObject());
    }
    stmt.free();
    
    return cap;
}


/**
 * Proviamo a popolare la tendina delle province con questa fantastica funzione asincrona :-)
 * 
 */
function populateProvince() {

    const province = _listaProvince();
    if (AppConfig.debugMode) console.log(`Caricate ${province.length} province: ${JSON.stringify(province)}`);

    // 1. Pulizia: Rimuovi tutte le opzioni esistenti tranne la prima (il placeholder)
    selectProvincia.innerHTML = '<option value="" selected disabled>Scegli una provincia...</option>';

    if (!province || province.length === 0) {
        console.warn("Nessuna provincia trovata.");
        return;
    }

    // 2. Ciclo per creare le nuove opzioni
    province.forEach(prov => {
        const option = document.createElement('option');
        option.value = prov.sigla;     // Usiamo la sigla (es: MI) come valore tecnico
        option.textContent = prov.nome_provincia; // Usiamo il nome (es: MILANO) come etichetta visibile
        
        selectProvincia.appendChild(option);
    });

    if (AppConfig.debugMode) console.log(`${province.length} province caricate nella select.`);
}


/**
 * Popola la tendina delle città a fronte della selezione della provincia
 *  
 * @param {string} provCode Codice della provincia selezionata
 */
function populateCity(provCode) {

    const city = _listaComuniByProvincia(provCode);
    if (AppConfig.debugMode) console.log(`Caricate ${city.length} città, per il codice provincia [${provCode}]: ${JSON.stringify(city)}`);

    // 1. Pulizia: Rimuovi tutte le opzioni esistenti tranne la prima (il placeholder)
    // Reset campo città
    selectComune.innerHTML = '<option value="">Caricamento comuni...</option>';
    selectComune.disabled = true;
    
    if (!city || city.length === 0) {
        console.warn(`Nessuna città trovata per la provincia [${provCode}]`);
        return;
    }

    selectComune.innerHTML = '<option value="">Seleziona città</option>';
    selectComune.disabled = false;

    // 2. Ciclo per creare le nuove opzioni
    city.forEach(c => {
        const option = document.createElement('option');
        option.value = c.nome_comune;
        option.textContent = c.nome_comune;
        
        selectComune.appendChild(option);
    });

    if (AppConfig.debugMode) console.log(`${city.length} città caricate nella select.`);
}


/**
 * Popola la tendina dei CAP a partire dal comune selezionato
 *  
 * @param {string} comune Nome del Comune di cui si vuole l'elenco dei CAP
 */
function populateCap(comune) {

    const cap = _listaCapByComune(comune);
    if (AppConfig.debugMode) console.log(`Caricati ${cap.length} CAP, per il comune [${comune}]: ${JSON.stringify(cap)}`);

    // 1. Pulizia: Rimuovi tutte le opzioni esistenti tranne la prima (il placeholder)
    // Reset campo città
    selectCap.innerHTML = '<option value="">Caricamento CAP...</option>';
    selectCap.disabled = true;
    
    if (!cap || cap.length === 0) {
        console.warn(`Nessun CAP trovato per il comune [${comune}]`);
        return;
    }

    selectCap.innerHTML = '<option value="">Seleziona CAP</option>';
    selectCap.disabled = false;

    // 2. Ciclo per creare le nuove opzioni
    cap.forEach(c => {
        const option = document.createElement('option');
        option.value = c.cap;
        option.textContent = c.cap;
        if ( cap.length === 1) option.selected = true;
        
        selectCap.appendChild(option);
    });

    if (AppConfig.debugMode) console.log(`${cap.length} CAP caricati nella select.`);
}
