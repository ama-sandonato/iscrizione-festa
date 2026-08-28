const form = document.getElementById('regForm');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const partecipantiDiv = document.getElementById('partecipanti');
const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');

const msg = document.getElementById('msg');

/** da spostare e togliere dallo scope globale */
const selectProvincia = document.getElementById('provincia');
const selectComune = document.getElementById('citta');
const selectCap = document.getElementById('cap');

const stepRiepilogo      = document.getElementById('stepRiepilogo');
const btnRiepilogoProsegui = document.getElementById('btnRiepilogoProsegui');
const btnRiepilogoIndietro = document.getElementById('btnRiepilogoIndietro');

let limit = undefined;

/**
 * Listener per l'inizializzazione del "mondo" ^_^
 * 
 */
window.addEventListener('DOMContentLoaded', async () => {
  console.log("Pagina caricata, procedo ad effettuare il caricamento dei dati della form...");

  //Nascondo sito, mostro spinner di caricamento
  const overlay = document.getElementById('loading-overlay');

  //inizializzo il database dei comuni
  await initDatabase();

  //inizializzo i limiti di iscrizione/prenotazione
  try {
    limit = await loadLimit();
    if (!limit) {
      throw new Error("Limiti non disponibili");
    }

    //prepara la form tenendo conto dei limiti ricevuti
    await buildForm(limit);
  }
  catch (err) {
    console.error("Errore durante il caricamento dei limiti:", err);
    overlay.style.display = 'none';
    mostraErrore(err);
    return; //esce così da tutto il processo di inizializzazione, lasciando solo il messaggio di errore visibile
  }

  //Nascondi spinner e mostra il sito
  overlay.style.display = 'none';

  //mi posiziono nel punto giusto
  step1.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

//Caricamento dei Comuni al cambio della Provincia
selectProvincia.addEventListener('change', e => populateCity(e.target.value));

selectComune.addEventListener('change', e => populateCap(e.target.value));

// Maiuscolo automatico per CF
document.getElementById('cf').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });

// Gestione tasto Indietro
btnBack.addEventListener('click', () => {
  step2.style.display = 'none';

  //rimuovo tutti i dettagli dei partecipanti
  while (partecipantiDiv.firstChild) {
    // The list is LIVE so it will re-index each call
    partecipantiDiv.removeChild(partecipantiDiv.firstChild);
  }

  stepRiepilogo.style.display = 'flex';
  stepRiepilogo.scrollIntoView({ behavior: 'smooth', block: 'start' });
});


// Gestione passaggio allo Step 2
btnNext.addEventListener('click', () => {

  //Verifico che i campi obbligatori dello step 1 siano stati compilati correttamente (validazione HTML5)
  let valid = checkFormValidity_Step1();
  if (!valid) return;
  

  //verifica numero partecipanti <=> menu
  const adulti = Number(document.getElementById('adulti').value);
  const minori = Number(document.getElementById('minori').value);
  const infanti = Number(document.getElementById('infanti').value);
  const menu_1 = Number(document.getElementById('menu1').value);
  const menu_2 = Number(document.getElementById('menu2').value);
  const birre  = Number(document.getElementById('birre').value);


  //verifico la congruenza tra numero di partecipanti e menu selezionati (es. non posso avere 5 menu se ho solo 4 partecipanti)
  valid = checkFormCongruence(adulti, minori, infanti, menu_1, menu_2);
  if (!valid) return;

  // tutte le validazioni ok → mostra riepilogo
  buildRiepilogo(adulti, minori, infanti, menu_1, menu_2, birre);

  step1.style.display         = 'none';
  step2.style.display         = 'none';
  stepRiepilogo.style.display = 'flex';
  stepRiepilogo.scrollIntoView({ behavior: 'smooth', block: 'start' });
});


function _buildStep2() {
  const adulti = Number(document.getElementById('adulti').value);
  const minori = Number(document.getElementById('minori').value);
  const infanti = Number(document.getElementById('infanti').value);

  // svuota eventuali partecipanti precedenti
  while (partecipantiDiv.firstChild) {
    partecipantiDiv.removeChild(partecipantiDiv.firstChild);
  }

  for (let i = 1; i < adulti; i++) {
    const p = document.createElement('div');
    p.className = 'partecipante adulto';
    p.innerHTML = `
      <h4>Adulto ${i+1}</h4>
      <div class="grid">
        <div>
          <label for="nome-adulto-${i+1}">Nome *</label>
          <input type="text" name="nome-adulto-${i+1}" required>
        </div>
        <div>
          <label for="cognome-adulto-${i+1}">Cognome *</label>
          <input type="text" name="cognome-adulto-${i+1}" required>
        </div>
      </div>
    `;
    partecipantiDiv.appendChild(p);
    partecipantiDiv.style.display = 'block';
  }

  for (let i = 1; i <= minori; i++) {
    const p = document.createElement('div');
    p.className = 'partecipante bambino';
    p.innerHTML = `
      <h4>Bambino (4-17 anni) ${i}</h4>
      <div class="grid">
        <div>
          <label for="nome-bambino-${i}">Nome *</label>
          <input type="text" name="nome-bambino-${i}" required>
        </div>
        <div>
          <label for="cognome-bambino-${i}">Cognome *</label>
          <input type="text" name="cognome-bambino-${i}" required>
        </div>
      </div>
    `;
    partecipantiDiv.appendChild(p);
    partecipantiDiv.style.display = 'flex';
  }

  for (let i = 1; i <= infanti; i++) {
    const p = document.createElement('div');
    p.className = 'partecipante infante';
    p.innerHTML = `
      <h4>Piccolo (0-3 anni) ${i}</h4>
      <div class="grid">
        <div>
          <label for="nome-infante-${i}">Nome *</label>
          <input type="text" name="nome-infante-${i}" required>
        </div>
        <div>
          <label for="cognome-infante-${i}">Cognome *</label>
          <input type="text" name="cognome-infante-${i}" required>
        </div>
      </div>
    `;
    partecipantiDiv.appendChild(p);
    partecipantiDiv.style.display = 'flex';
  }

  // il campo "frequenta la SMA" ha senso solo se ci sono bambini/infanti nell'iscrizione
  const smaWrapper = document.getElementById('sma-wrapper');
  const smaSelect  = document.getElementById('frequentaSma');
  if (minori > 0 || infanti > 0) {
    smaWrapper.style.display = 'block';
    smaSelect.required = true;
  } else {
    smaWrapper.style.display = 'none';
    smaSelect.required = false;
    smaSelect.value = '';
  }

  step2.style.display = 'flex';
  step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


btnRiepilogoIndietro.addEventListener('click', () => {
  stepRiepilogo.style.display = 'none';
  step1.style.display         = 'flex';
  step1.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

btnRiepilogoProsegui.addEventListener('click', () => {
  stepRiepilogo.style.display = 'none';
  // da qui in poi: stessa logica che era dentro btnNext dopo le validazioni
  _buildStep2();
});



// Invio Finale
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  //DEVO RIVALIDARE TUTTI I DATI DELLA FORM, COMPRESI QUELLI DINAMICI DEI PARTECIPANTI EXTRA
  let valid = checkFormValidity_Step1() && checkFormValidity_Step2();
  if (!valid) return;

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Convertiamo i numeri
  ['adulti','minori', 'infanti', 'menu1','menu2', 'birre'].forEach(k => {
    if(data[k]) data[k] = Number(data[k]);
  });

  // Raccolgo i partecipanti extra in un array
  const adulti = Number(document.getElementById('adulti').value);
  const minori = Number(document.getElementById('minori').value);
  const infanti = Number(document.getElementById('infanti').value);

  data.partecipanti = [];
  for (let i = 1; i < adulti; i++) {
    data.partecipanti.push({
      nome: formData.get(`nome-adulto-${i+1}`),
      cognome: formData.get(`cognome-adulto-${i+1}`),
      eta: "adulto"
    });
  }
  for (let i = 1; i <= minori; i++) {
    data.partecipanti.push({
      nome: formData.get(`nome-bambino-${i}`),
      cognome: formData.get(`cognome-bambino-${i}`),
      eta: "bambino"
    });
  }
  for (let i = 1; i <= infanti; i++) {
    data.partecipanti.push({
      nome: formData.get(`nome-infante-${i}`),
      cognome: formData.get(`cognome-infante-${i}`),
      eta: "infante"
    });
  }

  // Mostra caricamento sul bottone
  const btnSubmit = document.getElementById('btnSubmit');
  btnSubmit.disabled = true;
  btnSubmit.textContent = "Invio in corso...";
  const overlay = document.getElementById('loading-overlay');
  overlay.style.display = 'flex';

  
  if ( AppConfig.debugMode ) {
    console.log("Invio i dati al server:", JSON.stringify(data));
  }

  fetch(AppConfig.apiUrl, {
    method: 'POST',
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: "registraNuovoIscritto",
      formData: data
    })
  })
  .then(res => res.json())
  .then(res => {
    mostraRisultato(res);
  })
  .catch(err => {
    mostraErrore(err);
  })
  .finally( e => {
    overlay.style.display = 'none';
  });

});

function mostraRisultato(res) {
  if (AppConfig.debugMode) {
    console.log("[mostraRisultato]", "Ricevuta risposta dal server ->", JSON.stringify(res));
  }

  //nascondo i vari step precedenti
  step1.style.display = 'none';
  step2.style.display = 'none';
  stepRiepilogo.style.display = 'none';

  //aggiorno il messaggio
  msg.innerHTML = res.messaggio + '<button type="button" id="btnHome" class="btn-secondary">NUOVA PRENOTAZIONE</button>';
  msg.className = 'success';
  msg.style.display = 'flex';
  msg.scrollIntoView({ behavior: 'smooth', block: 'start' });

  //reset della form
  form.reset();
  
  //rivado in home sul click
  document.getElementById('btnHome')
          .addEventListener('click', () => { location.reload(); });
}


function mostraErrore(err) {
  //nascondo i vari step precedenti
  step1.style.display = 'none';
  step2.style.display = 'none';
  stepRiepilogo.style.display = 'none';

  //aggiorno il messaggio
  if ( err && err.message ) {
    msg.innerHTML = `<em>${err.message}</em><br><br>`;
  } else {
    //messaggio di errore generico
    msg.innerHTML = 'Si è verificato un errore.<br>Controlla la connessione e riprova.<br><br>';
  }

  msg.innerHTML += '<button type="button" id="btnHome" class="btn-secondary">RIPROVA</button>';
  msg.className = 'error';
  msg.style.display = 'flex';
  msg.scrollIntoView({ behavior: 'smooth', block: 'start' });

    //rivado in home sul click
  document.getElementById('btnHome')
          .addEventListener('click', () => { location.reload(); });
}


// =====================
// RIEPILOGO
// =====================
function buildRiepilogo(adulti, minori, infanti, menu_1, menu_2, birre) {
  const prezzi        = limit.prezzi;

  const costoMenu1        = menu_1 * prezzi.menu1;
  const costoMenu2        = menu_2 * prezzi.menu2;
  const costoBirre        = birre * prezzi.birra;
  const totale            = costoMenu1 + costoMenu2 + costoBirre;

  const fmt = (n) => `€ ${Number(n).toFixed(2)}`;

  let html = `
    <!-- PARTECIPANTI -->
    <div class="riepilogo-sezione">
      <div class="riepilogo-sezione-titolo">👥 Partecipanti</div>
      ${adulti > 0 ? `
      <div class="riepilogo-riga">
        <span>Adulti</span>
        <span>${adulti}</span>
      </div>` : ''}
      ${minori > 0 ? `
      <div class="riepilogo-riga">
        <span>Bambini 4-17 anni</span>
        <span>${minori}</span>
      </div>` : ''}
      ${infanti > 0 ? `
      <div class="riepilogo-riga">
        <span>Piccoli 0-3 anni</span>
        <span>${infanti}</span>
      </div>` : ''}
    </div>

    <!-- MENU E INGRESSI -->
    <div class="riepilogo-sezione">
      <div class="riepilogo-sezione-titolo">🍽️ Menù</div>
      ${menu_1 > 0 ? `
      <div class="riepilogo-riga">
        <span>Menù Pizza 🍕 × ${menu_1}</span>
        <span>${fmt(costoMenu1)}</span>
      </div>` : ''}
      ${menu_2 > 0 ? `
      <div class="riepilogo-riga">
        <span>Menù Focaccia farcita 🥪 × ${menu_2}</span>
        <span>${fmt(costoMenu2)}</span>
      </div>` : ''}
      ${birre > 0 ? `
      <div class="riepilogo-riga">
        <span>Birra artigianale 🍺 × ${birre}</span>
        <span>${fmt(costoBirre)}</span>
      </div>` : ''}
    </div>

    <!-- TOTALE -->
    <div class="riepilogo-sezione">
      <div class="riepilogo-riga totale-finale">
        <span>💶 Totale da versare</span>
        <span>${fmt(totale)}</span>
      </div>
    </div>
  `;

  document.getElementById('riepilogo-content').innerHTML = html;
}

// =====================
// MODALE DI CONFERMA
// =====================
function openConfirmModal(testo) {
  document.getElementById('confirmModalText').innerHTML = testo;
  document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
}

// =====================
// MODALE CONDIZIONI GENERALI
// =====================
function openDisclaimerModal() {
  const body = document.getElementById('disclaimerModalBody');
  const btn  = document.getElementById('btnAccettaDisclaimer');

  document.getElementById('disclaimerModal').style.display = 'flex';
  body.scrollTop = 0;
  btn.disabled = true;

  // aspetta il reflow (display:flex) prima di misurare scrollHeight/clientHeight
  requestAnimationFrame(_checkDisclaimerScroll);
}

function closeDisclaimerModal() {
  document.getElementById('disclaimerModal').style.display = 'none';
}

function _checkDisclaimerScroll() {
  const body = document.getElementById('disclaimerModalBody');
  const btn  = document.getElementById('btnAccettaDisclaimer');
  const scrolledToBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 4;
  if (scrolledToBottom) btn.disabled = false;
}

document.getElementById('disclaimerModalBody').addEventListener('scroll', _checkDisclaimerScroll);

// il checkbox si spunta solo tramite accettaDisclaimer(): blocco il toggle manuale,
// sia da click diretto sia da click sulla <label for="disclaimer"> associata
// (il click sulla label attiva comunque l'input anche se l'input ha pointer-events:none)
document.getElementById('disclaimer').addEventListener('click', (e) => e.preventDefault());

function accettaDisclaimer() {
  const btn = document.getElementById('btnAccettaDisclaimer');
  if (btn.disabled) return;

  document.getElementById('disclaimer').checked = true;
  document.getElementById('btnApriDisclaimer').textContent = '✅ Condizioni Generali accettate (rileggi)';
  closeDisclaimerModal();
}