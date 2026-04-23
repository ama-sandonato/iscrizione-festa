let db = null;

async function initDatabase() {
    // 1. Carica il file WASM della libreria
    const sqlPromise = initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.6.2/${file}`
    });

    // 2. Scarica il file del database creato con lo script
    const dataPromise = fetch("./resources/comuni.db").then(res => res.arrayBuffer());

    const [SQL, buf] = await Promise.all([sqlPromise, dataPromise]);

    // 3. Inizializza il DB in memoria
    db = new SQL.Database(new Uint8Array(buf));
    console.log("Database SQLite pronto!");
}

//Recupera comuni dopo aver scelto la provincia
function getComuniByProvincia(sigla) {
    if (!db) return;

    const stmt = db.prepare("SELECT nome, codice_istat FROM comuni WHERE sigla_prov = :sigla ORDER BY nome ASC");
    stmt.bind({":sigla": sigla.toLowerCase()});

    const comuni = [];
    while (stmt.step()) {
        comuni.push(stmt.getAsObject());
    }
    stmt.free();
    
    return comuni;
}