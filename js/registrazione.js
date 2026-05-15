const form = document.getElementById('regForm');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const partecipantiDiv = document.getElementById('partecipanti');
const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');

const msg = document.getElementById('msg');
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
  limit = await loadLimit();

  //prepara la form tenendo conto dei limiti ricevuti
  await buildForm(limit);

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
  // Validiamo solo i campi visibili dello Step 1
  const inputsStep1 = step1.querySelectorAll('input');
  let valid = true;
  inputsStep1.forEach(input => {
    if (!input.checkValidity()) {
      input.reportValidity();
      valid = false;
    }
  });

  if (!valid) return;

  //verifica numero partecipanti <=> menu
  const adulti = Number(document.getElementById('adulti').value);
  const minori = Number(document.getElementById('minori').value);
  const infanti = Number(document.getElementById('infanti').value);
  const menu_1 = Number(document.getElementById('menu1').value);
  const menu_2 = Number(document.getElementById('menu2').value);
  const birre  = Number(document.getElementById('birre').value);

  const partecimantiTotali = adulti + minori;
  const totaleMenu = menu_1 + menu_2;
  const soloIngressi = partecimantiTotali - (totaleMenu);
  if ( AppConfig.debugMode ) {
    console.log("Controllo disponibilità menu:", {
      menu_1, menu_2, soloIngressi, partecimantiTotali, totaleMenu, limit
    });
  }


  //per prima cosa verifico che ogni singolo menu non superi i limiti imposti
  if ( menu_1 > limit.disp.menu1 ) {
    openConfirmModal(`Il numero dei Menu "pizza" selezionati supera la disponibilità: (${limit.disp.menu1} disponibili).`);
    return;
  }
  
  if ( menu_2 > limit.disp.menu2 ) {
    openConfirmModal(`Il numero dei Menu "Hot Dog" selezionati supera la disponibilità: (${limit.disp.menu2} disponibili).`);
    return;
  }

  //verifico se gli ingressi senza menu hanno disponibilità nei limiti
  if (soloIngressi > limit.disp.soloIngressi) {
    openConfirmModal(`Il numero di partecipanti senza menu (${soloIngressi}) supera la disponibilità (${limit.disp.soloIngressi} disponibili)`);
    //alert(`Il numero di partecipanti senza menu supera la disponibilità (${limit.disp.soloIngressi} disponibili).`);
    return;
  }

  //verifico che il numero totale di menu selezionati non superi il numero totale di partecipanti
  if (totaleMenu > partecimantiTotali) {
    openConfirmModal(`Il numero totale di menu selezionati (${totaleMenu} menù) non può superare il numero totale di partecipanti (${partecimantiTotali} adulti + bambini).`);
    return;
  }
  // tutte le validazioni ok → mostra riepilogo
  buildRiepilogo(adulti, minori, infanti, menu_1, menu_2, birre);
  step1.style.display         = 'none';
  stepRiepilogo.style.display = 'flex';
  stepRiepilogo.scrollIntoView({ behavior: 'smooth', block: 'start' });
});


function _buildStep2() {
  const adulti = Number(document.getElementById('adulti').value);
  const minori = Number(document.getElementById('minori').value);

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
          <label>Nome *</label>
          <input type="text" name="nome-adulto-${i+1}" required>
        </div>
        <div>
          <label>Cognome *</label>
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
      <h4>Bambino (minore) ${i}</h4>
      <div class="grid">
        <div>
          <label>Nome *</label>
          <input type="text" name="nome-bambino-${i}" required>
        </div>
        <div>
          <label>Cognome *</label>
          <input type="text" name="cognome-bambino-${i}" required>
        </div>
      </div>
    `;
    partecipantiDiv.appendChild(p);
    partecipantiDiv.style.display = 'flex';
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

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Convertiamo i numeri
  ['adulti','minori', 'infanti', 'menu1','menu2','birre'].forEach(k => {
    if(data[k]) data[k] = Number(data[k]);
  });

  // Raccolgo i partecipanti extra in un array
  const adulti = Number(document.getElementById('adulti').value);
  const minori = Number(document.getElementById('minori').value);
  
  data.partecipanti = [];
  for (let i = 1; i < adulti; i++) {
    data.partecipanti.push({
      nome: formData.get(`nome-adulto-${i+1}`),
      cognome: formData.get(`cognome-adulto-${i+1}`),
      adulto: "si"
    });
  }
  for (let i = 1; i <= minori; i++) {
    data.partecipanti.push({
      nome: formData.get(`nome-bambino-${i}`),
      cognome: formData.get(`cognome-bambino-${i}`),
      adulto: "no"
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
    mostraErrore();
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

  //reset della form
  form.reset();
  
  //rivado in home sul click
  document.getElementById('btnHome')
          .addEventListener('click', () => { location.reload(); });
}

function mostraErrore() {
  //nascondo i vari step precedenti
  step1.style.display = 'none';
  step2.style.display = 'none';
  stepRiepilogo.style.display = 'none';

  //aggiorno il messaggio
  msg.innerHTML = 'Si è verificato un errore.<br>Controlla la connessione e riprova.<br><br>'  + '<button type="button" id="btnHome" class="btn-secondary">RIPROVA</button>';
  msg.className = 'error';
  msg.style.display = 'flex';

    //rivado in home sul click
  document.getElementById('btnHome')
          .addEventListener('click', () => { location.reload(); });
}


// =====================
// RIEPILOGO
// =====================
function buildRiepilogo(adulti, minori, infanti, menu_1, menu_2, birre) {
  const prezzi      = limit.prezzi;
  const soloIngressi = (adulti + minori) - (menu_1 + menu_2);

  const costoMenu1        = menu_1 * prezzi.menu1;
  const costoMenu2        = menu_2 * prezzi.menu2;
  const costoSoloIngressi = soloIngressi * prezzi.soloIngresso;
  const costoBirre        = birre * prezzi.birra;
  const totale            = costoMenu1 + costoMenu2 + costoSoloIngressi + costoBirre;

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
        <span>Minori (3-18 anni)</span>
        <span>${minori}</span>
      </div>` : ''}
      ${infanti > 0 ? `
      <div class="riepilogo-riga">
        <span>Bambini 0-3 anni <span class="riepilogo-gratis">gratuito</span></span>
        <span>${infanti}</span>
      </div>` : ''}
    </div>

    <!-- MENU E INGRESSI -->
    <div class="riepilogo-sezione">
      <div class="riepilogo-sezione-titolo">🍽️ Menù e Ingressi</div>
      ${menu_1 > 0 ? `
      <div class="riepilogo-riga">
        <span>Menù Pizza 🍕 × ${menu_1}</span>
        <span>${fmt(costoMenu1)}</span>
      </div>` : ''}
      ${menu_2 > 0 ? `
      <div class="riepilogo-riga">
        <span>Menù Hot Dog 🌭 × ${menu_2}</span>
        <span>${fmt(costoMenu2)}</span>
      </div>` : ''}
      ${soloIngressi > 0 ? `
      <div class="riepilogo-riga">
        <span>Solo ingresso 🎟️ × ${soloIngressi}</span>
        <span>${fmt(costoSoloIngressi)}</span>
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