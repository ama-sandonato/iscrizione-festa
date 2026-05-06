const AppConfig = (() => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "172.28.16.1";
    const isGitHubPages = window.location.hostname.includes("ama-sandonato.github.io");

    return {
        apiUrl: isGitHubPages ? "https://script.google.com/macros/s/AKfycbywhbbHNVrJIKJSH0RJ5sllwp-khgMkKK0zhP9_pMNWHMi__P_3SoTxPCpl0lVJ99gW/exec" : "http://localhost:8080/exec",
        debugMode: isLocal,
        timeout: isLocal ? 1000 : 5000
    };
})();


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
  finally {
    return data; // ← ora chi chiama la funzione riceve i dati
  }
}


async function buildForm(limit) {
  const dispParticipants = Number(limit.disp.partecipanti);
  const dispNoMenu = Number(limit.disp.soloIngressi);
  const dispMenu1 = Number(limit.disp.menu1);
  const dispMenu2 = Number(limit.disp.menu2);

  //se dispParticipants == 0 ==> CHIUDO LA FORM
  if ( dispParticipants === 0 ) {
    //nascondo i vari step precedenti
    step1.style.display = 'none';
    step2.style.display = 'none';

    //aggiorno il messaggio
    msg.innerHTML = '⛔ Siamo spiacenti, le iscrizioni sono chiuse.<br>Il numero massimo di partecipanti è stato raggiunto.';
    msg.className = 'error';
    msg.style.display = 'flex';
  } else {
    //partecipanti > 0, prendo il min tra 10 e i 2/3 per gli adulti, e 1/3 dei bambini
    const maxAdulti = Math.min(10, Math.round(dispParticipants * 0.66));
    const maxMinori = Math.min(10, dispParticipants - maxAdulti);
    if( AppConfig.debugMode) {
      console.debug(`Caricati i limiti di partecipanti: adulti[${maxAdulti}], minori[${maxMinori}]`);
    }

    //popolo le tendine
    const selectAdulti = document.getElementById('adulti');
    const selectMinori = document.getElementById('minori');
    const selectInfanti = document.getElementById('infanti');
    
    populateOptions(selectAdulti, Array.from({ length: maxAdulti }, (_, i) => i + 1));
    populateOptions(selectMinori, Array.from({ length: maxMinori+1 }, (_, i) => i));
    populateOptions(selectInfanti, Array.from({ length: 6 }, (_, i) => i));
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