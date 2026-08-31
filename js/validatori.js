/**
 * Verifica che i due campi email (email e conferma email) coincidano.
 */
function checkEmailConferma(email, emailConferma) {
    if (email.trim().toLowerCase() !== emailConferma.trim().toLowerCase()) {
        openConfirmModal(`Gli indirizzi email inseriti non coincidono. Controlla di aver scritto correttamente la tua email in entrambi i campi.`);
        return false;
    }

    return true;
}


/**
 * Estrae l'età dal codice fiscale italiano (posizioni 7-11: anno, mese, giorno di nascita).
 * Non valida il carattere di controllo finale (non serve, del formato ci pensa già la regex
 * sul campo CF): questa funzione stima solo la data di nascita per calcolare l'età.
 *
 * @returns {number|null} età in anni, o null se il CF non è nel formato atteso
 */
function _getEtaDaCodiceFiscale(cf) {
    if (!cf || cf.length < 11) return null;

    const cfUpper = cf.toUpperCase();
    const meseChar = cfUpper.charAt(8);
    const mesiMap = { A:0, B:1, C:2, D:3, E:4, H:5, L:6, M:7, P:8, R:9, S:10, T:11 };
    const mese = mesiMap[meseChar];
    if (mese === undefined) return null;

    let giorno = parseInt(cfUpper.substring(9, 11), 10);
    if (isNaN(giorno)) return null;
    if (giorno > 40) giorno -= 40; // donna

    let anno = parseInt(cfUpper.substring(6, 8), 10);
    if (isNaN(anno)) return null;

    const oggi = new Date();
    const annoCorrenteBreve = oggi.getFullYear() % 100;
    anno += (anno > annoCorrenteBreve) ? 1900 : 2000;

    const dataNascita = new Date(anno, mese, giorno);
    if (isNaN(dataNascita.getTime())) return null;

    let eta = oggi.getFullYear() - dataNascita.getFullYear();
    const scartoMesi = oggi.getMonth() - dataNascita.getMonth();
    if (scartoMesi < 0 || (scartoMesi === 0 && oggi.getDate() < dataNascita.getDate())) {
        eta--;
    }

    return eta;
}


/**
 * Verifica che il titolare dell'iscrizione (dedotto dal CF) sia maggiorenne.
 * Se il CF non è nel formato riconosciuto, non blocca: ci pensa già la regex sul campo.
 */
function checkMaggiorenne(cf) {
    const eta = _getEtaDaCodiceFiscale(cf);
    if (eta === null) return true;

    if (eta < 18) {
        openConfirmModal(`Il titolare dell'iscrizione deve essere maggiorenne. Verifica il codice fiscale inserito.`);
        return false;
    }

    return true;
}


/**
 * Verifica la disponibilità di un menu tenendo conto della tolleranza di overbooking:
 * concessa una tantum, entro il limite di "tolleranza" unità, quando la disponibilità
 * residua non basta. Se la disponibilità è già negativa la tolleranza è già stata
 * usata da qualcun altro e il menu è definitivamente chiuso.
 *
 * @returns {string|null} Messaggio di errore da mostrare, oppure null se la richiesta è consentita
 */
function _checkMenuTolerance(richiesto, disponibile, tolleranza, nomeMenu) {
    if (richiesto <= disponibile) return null;

    if (disponibile < 0) {
        return `Il menu "${nomeMenu}" è esaurito. Non è più disponibile.`;
    }

    const sforamento = richiesto - disponibile;
    if (sforamento > tolleranza) {
        return `Il numero dei Menu "${nomeMenu}" selezionati supera anche la disponibilità straordinaria: (${disponibile} disponibili, massimo ${tolleranza} extra).`;
    }

    return null;
}


function checkFormValidity_Step1() {

  // Validiamo solo i campi visibili dello Step 1
  const inputsStep1 = step1.querySelectorAll('input, select');
  let valid = true;
  for (const input of inputsStep1) {
    if (!input.checkValidity()) {
      input.reportValidity(); // mostra il tooltip sul primo campo invalido
      valid = false;
      break; // si ferma subito
    }
  }

  return valid;
}


function checkFormValidity_Step2() {
    // Validiamo solo i campi visibili dello Step 2
    const inputsStep2 = step2.querySelectorAll('input, select');
    let valid = true;
    for (const input of inputsStep2) {
      if (!input.checkValidity()) {
        input.reportValidity(); // mostra il tooltip sul primo campo invalido
        valid = false;
        break; // si ferma subito
      }
    }
  
    return valid;
}

function checkFormCongruence(adulti, bambini, infanti, menu_1, menu_2) {

    const minPartecipanti = adulti + bambini;
    const maxPartecipanti = minPartecipanti + infanti;
    const totaleMenu = menu_1 + menu_2;
    
    //qui per sicurezza ricarico i limiti (in caso siano cambiati da quando è stata caricata la pagina)
    loadLimit()
    .then(newLimit => {
        limit = newLimit;
    })
    .catch(err => {
        console.error("Errore ricaricamento limiti:", err);
        openConfirmModal("Si è verificato un errore imprevisto durante la verifica dei limiti di disponibilità. Per favore riprova più tardi.");
        return false;
    });

    //per prima cosa verifico che ogni singolo menu non superi i limiti imposti (con tolleranza di overbooking)
    const erroreMenu1 = _checkMenuTolerance(menu_1, limit.disp.menu1, Number(limit.overbooking?.menu1 || 0), 'pizza');
    if (erroreMenu1) {
        openConfirmModal(erroreMenu1);
        return false;
    }

    const erroreMenu2 = _checkMenuTolerance(menu_2, limit.disp.menu2, Number(limit.overbooking?.menu2 || 0), 'Focaccia farcita');
    if (erroreMenu2) {
        openConfirmModal(erroreMenu2);
        return false;
    }

    //verifico che il numero totale di menu selezionati non superi il numero totale di partecipanti
    if (totaleMenu < minPartecipanti ) {
      openConfirmModal(`Il numero minimo di menù selezionabili deve coincidere con il totale dei partecipanti 4+ indicati (adulti + bambini da 4 a 17 anni).`);
      return false;
    }

    if ( totaleMenu > maxPartecipanti ) {
        openConfirmModal(`Il numero massimo di menù selezionabili non può superare il totale dei partecipanti indicati (adulti + bambini 4-17 anni + bambini 0-3 anni).`);
        return false;
    }

    //se siamo arrivati qui, vuol dire che tutto è congruente
    return true;
}