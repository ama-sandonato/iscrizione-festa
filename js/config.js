const AppConfig = (() => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "172.28.16.1";
    const isGitHubPages = window.location.hostname.includes("ama-sandonato.github.io");

    return {
        apiUrl: isGitHubPages ? "https://script.google.com/macros/s/AKfycbywhbbHNVrJIKJSH0RJ5sllwp-khgMkKK0zhP9_pMNWHMi__P_3SoTxPCpl0lVJ99gW/exec" : "http://localhost:8080/exec",
        debugMode: isLocal,
        timeout: isLocal ? 1000 : 5000
    };
})();


/**
 * Restituisce i limiti di partecipazione e disponibilità per la festa.
 * I dati vengono caricati da un endpoint API (definito in AppConfig.apiUrl) tramite una richiesta POST con un payload JSON che specifica l'azione "getLimits".
 * 
 * Cosa FONDAMENTALE: nelle sezione "disp" il campo "partecipanti" DEVE essere SEMPRE UGUALE alla somma di "soloIngressi", "menu1" e "menu2". 
 * Se questo non è vero, il sistema potrebbe comportarsi in modo imprevedibile (es. permettere più partecipanti di quelli disponibili). 
 * 
 * Il formato dei dati restituiti è:
        {
            "disp": {
                "partecipanti": 15,
                "menu1": 10,
                "menu2": 5
            },
            "prezzi": {
                "menu1": 16,
                "menu2": 16,
                "birra": 4
            },
            "maintenance": {
              "enabled": false,
              "message": "Il sistema è in manutenzione. Riprova più tardi."
            }
        }
 * @returns {Promise<Object>} dati dei limiti
 * @throws {Error} se il caricamento fallisce
 */
async function loadLimit() {

  let data;
  try {
    const res  = await fetch(AppConfig.apiUrl, {
      method : 'POST',
      headers: { "Content-Type": "text/plain" },
      body   : JSON.stringify({ action: "getLimits" })
    });

    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    data = await res.json();

    if (AppConfig.debugMode) {
      console.debug("Caricamento limiti OK:", JSON.stringify(data, null, 2));
    }
  } 
  catch (err) {
    if (AppConfig.debugMode) {
      console.debug("Caricamento limiti FALLITO:", err);
    }
    throw err; // ← rilancia l'errore così chi chiama sa che è fallita
  }

  if (data.maintenance.enabled) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('overrideMaintenance') && urlParams.get('overrideMaintenance') === 'true') {
      console.warn("Accesso in modalità override alla manutenzione.");
    } else {
      throw new Error(`${data.maintenance.message}`);
    }
  }

  return data; // ← ora chi chiama la funzione riceve i dati
}


async function buildForm(limit) {
  const dispParticipants = Number(limit.disp.partecipanti);
  const dispMenu1 = Number(limit.disp.menu1);
  const dispMenu2 = Number(limit.disp.menu2);

  //check di conguenza tra partecipanti e menu disponibili
  const totalMenu = dispMenu1 + dispMenu2;
  if ( totalMenu !== dispParticipants) {
    console.warn(`Attenzione: il totale dei menu disponibili (${totalMenu}) è maggiore del numero di partecipanti (${dispParticipants}). Questo potrebbe causare problemi nella gestione delle iscrizioni.`);
    throw new Error(`Incongruenza nei dati: partecipanti [${dispParticipants}] vs totale menu disponibili [${totalMenu}]. Controlla i dati restituiti dall'API.`);
  }

  //se dispParticipants == 0 ==> CHIUDO LA FORM
  if ( dispParticipants === 0 ) {
    //nascondo i vari step precedenti
    step1.style.display = 'none';
    step2.style.display = 'none';
    stepRiepilogo.style.display = 'none';

    //aggiorno il messaggio
    msg.innerHTML = `
      ⛔ Siamo spiacenti, le iscrizioni sono chiuse.<br>
      Il numero massimo di partecipanti è stato raggiunto.<br><br>
      Ti invitiamo a controllare nuovamente tra qualche giorno, nel caso in cui si liberasse qualche posto!`;
    msg.className = 'error';
    msg.style.display = 'flex';
    return;
  } else {
    //partecipanti > 0, prendo il min tra 10 e i 2/3 per gli adulti, e 1/3 dei bambini
    const maxAdulti = Math.min(10, Math.round(dispParticipants * 0.66));
    const maxMinori = Math.min(6, dispParticipants - maxAdulti);
    const maxInfanti = 6; //fisso a 6, ma in realtà non c'è un limite preciso, dipende da quanti adulti ci sono (es. se ci sono 2 adulti, potrei avere al massimo 4 infanti, se ci sono 3 adulti potrei avere al massimo
    if( AppConfig.debugMode) {
      console.debug(`Caricati i limiti di partecipanti: adulti[${maxAdulti}], minori[${maxMinori}]`);
    }

    //popolo le tendine
    const selectAdulti = document.getElementById('adulti');
    const selectMinori = document.getElementById('minori');
    const selectInfanti = document.getElementById('infanti');
    
    populateOptions(selectAdulti, Array.from({ length: maxAdulti }, (_, i) => i + 1));
    populateOptions(selectMinori, Array.from({ length: maxMinori+1 }, (_, i) => i));
    populateOptions(selectInfanti, Array.from({ length: maxInfanti+1 }, (_, i) => i));
  }

  const maxMenu1 = Math.min(10, dispMenu1);
  const selectMenu1 = document.getElementById('menu1');
  populateOptions(selectMenu1, Array.from({ length: maxMenu1+1 }, (_, i) => i));

  const maxMenu2 = Math.min(10, dispMenu2);
  const selectMenu2 = document.getElementById('menu2');
  populateOptions(selectMenu2, Array.from({ length: maxMenu2+1 }, (_, i) => i));

  const selectBirre = document.getElementById('birre');
  populateOptions(selectBirre, Array.from({ length: 11 }, (_, i) => i));
}


function populateOptions(selectField, optionList) {

  // Reset campo città
  selectField.innerHTML = '<option value="">⛔ esaurito</option>';
  selectField.disabled = true;

  if (!optionList || optionList.length === 0 || (optionList.length === 1 && optionList[0] === 0)) {
      console.warn(`lista di option vuota`);
      return;
  }

  selectField.disabled = false;
  selectField.innerHTML = '';

  // 2. Ciclo per creare le nuove opzioni
  optionList.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      if ( optionList.length === 1) option.selected = true;
      
      selectField.appendChild(option);
  });

  if (AppConfig.debugMode) console.log(`${optionList.length} options caricati nella select.`);
}