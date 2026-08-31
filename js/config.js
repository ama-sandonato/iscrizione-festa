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
 * Il formato dei dati restituiti è:
        {
            "disp": {
                "menu1": 10,
                "menu2": 5
            },
            "overbooking": {
                "menu1": 5,
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
  const dispMenu1 = Number(limit.disp.menu1);
  const dispMenu2 = Number(limit.disp.menu2);

  const overbookingMenu1 = Number(limit.overbooking?.menu1 || 0);
  const overbookingMenu2 = Number(limit.overbooking?.menu2 || 0);

  //un menu è "chiuso" quando la disponibilità è negativa: significa che qualcuno
  //ha già usufruito della tolleranza di overbooking, quindi non se ne concede altra
  const menu1Chiuso = dispMenu1 < 0;
  const menu2Chiuso = dispMenu2 < 0;

  //capacità "effettiva" di ciascun menu, tolleranza di overbooking inclusa (0 se il menu è chiuso):
  //serve a dimensionare le tendine adulti/bambini così da poter effettivamente selezionare
  //abbastanza partecipanti da giustificare un'eventuale scelta in overbooking sui menu
  const effettivoMenu1 = menu1Chiuso ? 0 : dispMenu1 + overbookingMenu1;
  const effettivoMenu2 = menu2Chiuso ? 0 : dispMenu2 + overbookingMenu2;
  const dispParticipants = effettivoMenu1 + effettivoMenu2;

  //se ENTRAMBI i menu sono chiusi ==> CHIUDO TUTTA LA FORM
  if ( menu1Chiuso && menu2Chiuso ) {
    //nascondo i vari step precedenti
    step1.style.display = 'none';
    step2.style.display = 'none';
    stepRiepilogo.style.display = 'none';

    //aggiorno il messaggio (in un div interno: #msg è un contenitore flex per la centratura,
    //non deve contenere direttamente testo/HTML grezzo altrimenti il browser lo spezzetta in
    //blocchi anonimi centrati singolarmente)
    msg.innerHTML = `<div class="error">
      ⛔ Siamo spiacenti, le iscrizioni sono chiuse.<br>
      Il numero massimo di partecipanti è stato raggiunto.<br><br>
      Ti invitiamo a controllare nuovamente tra qualche giorno, nel caso in cui si liberasse qualche posto!
    </div>`;
    msg.style.display = 'flex';
    return;
  }

  //almeno un menu è ancora disponibile (anche solo con tolleranza extra): ogni tendina può arrivare
  //fino alla capacità totale disponibile, senza vincolarsi a una proporzione adulti/bambini fissa
  //(la composizione reale della famiglia è libera, es. 2 adulti + 6 bambini è legittimo quanto il contrario);
  //la coerenza vera tra partecipanti e menu selezionati è verificata da checkFormCongruence().
  //Gli adulti partono sempre da almeno 1 (obbligatorio in ogni iscrizione).
  const maxAdulti = Math.min(10, Math.max(1, dispParticipants));
  const maxMinori = Math.min(6, Math.max(0, dispParticipants));
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

  populateMenuOptions(document.getElementById('menu1'), dispMenu1, overbookingMenu1);
  populateMenuOptions(document.getElementById('menu2'), dispMenu2, overbookingMenu2);

  const selectBirre = document.getElementById('birre');
  populateOptions(selectBirre, Array.from({ length: 11 }, (_, i) => i));
}


/**
 * Popola la tendina di un menu (menu1/menu2) tenendo conto della tolleranza di overbooking.
 * Se il menu è chiuso (disponibilità negativa: la tolleranza è già stata usata da qualcun altro),
 * mostra una singola opzione "0" selezionata e NON disabilitata — a differenza di populateOptions(),
 * che disabiliterebbe il campo escludendolo dal FormData in fase di submit.
 *
 * @param {HTMLSelectElement} selectField
 * @param {number} disp Disponibilità residua per il menu (può essere negativa se già in overbooking)
 * @param {number} tolleranza Unità extra concedibili una tantum oltre la disponibilità residua
 */
function populateMenuOptions(selectField, disp, tolleranza) {
  if (disp < 0) {
    selectField.innerHTML = '';
    selectField.disabled = false;
    const option = document.createElement('option');
    option.value = '0';
    option.textContent = '⛔ esaurito';
    option.selected = true;
    selectField.appendChild(option);
    return;
  }

  const max = Math.min(10, disp + tolleranza);
  populateOptions(selectField, Array.from({ length: max + 1 }, (_, i) => i));
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