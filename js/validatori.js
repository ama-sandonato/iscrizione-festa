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

    //per prima cosa verifico che ogni singolo menu non superi i limiti imposti
    if ( menu_1 > limit.disp.menu1 ) {
        openConfirmModal(`Il numero dei Menu "pizza" selezionati supera la disponibilità: (${limit.disp.menu1} disponibili).`);
        return false;
    }
    
    if ( menu_2 > limit.disp.menu2 ) {
        openConfirmModal(`Il numero dei Menu "Hot Dog" selezionati supera la disponibilità: (${limit.disp.menu2} disponibili).`);
        return false;
    }

    //verifico che il numero totale di menu selezionati non superi il numero totale di partecipanti
    if (totaleMenu < minPartecipanti ) {
      openConfirmModal(`Il numero minimo di menù acquistabili deve coincidere con il totale dei partecipanti 4+ indicati (adulti + bambini da 4 a 17 anni).`);
      return false;
    } 
      
    if ( totaleMenu > maxPartecipanti ) {
        openConfirmModal(`Il numero massimo di menù acquistabili non può superare il totale dei partecipanti indicati (adulti + bambini 4-17 anni + bambini 0-3 anni).`);
        return false;
    }

    //se siamo arrivati qui, vuol dire che tutto è congruente
    return true;
}