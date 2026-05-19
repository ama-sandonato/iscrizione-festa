function checkFormValidity_Step1() {

  // Validiamo solo i campi visibili dello Step 1
  const inputsStep1 = step1.querySelectorAll('input', 'select');
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
    const inputsStep2 = step2.querySelectorAll('input', 'select');
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

function checkFormCongruence(adulti, minori, menu_1, menu_2) {

    const partecimantiTotali = adulti + minori;
    const totaleMenu = menu_1 + menu_2;
    
    if ( AppConfig.debugMode ) {
      console.log("[checkFormCongruence] - Controllo disponibilità menu:", {
        menu_1, menu_2, partecimantiTotali, totaleMenu, limit
      });
    }
  
    //qui per sicurezza dovrei ricaricare i limiti (in caso siano cambiati da quando è stata caricata la pagina), ma per ora mi affido a quelli caricati all'inizio
    loadLimit()
    .then(newLimit => {
        limit = newLimit;
    })
    .catch(err => {
        console.error("Errore ricaricamento limiti:", err);
        openConfirmModal("Si è verificato un errore imprevisto durante la verifica dei limiti di disponibilità. Per favore riprova più tardi.");
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
    if (totaleMenu !== partecimantiTotali) {
        openConfirmModal(`Il numero totale di menu selezionati non può essere diverso dal numero totale di partecipanti.`);
        return false;
    }

    //se siamo arrivati qui, vuol dire che tutto è congruente
    return true;
}