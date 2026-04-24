const form = document.getElementById('regForm');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const partecipantiDiv = document.getElementById('partecipanti');
const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');

const msg = document.getElementById('msg');
const selectProvincia = document.getElementById('provincia');
const selectCitta = document.getElementById('citta');

/**
 * Listener per l'inizializzazione del "mondo" ^_^
 * 
 */
window.addEventListener('DOMContentLoaded', async () => {
  console.log("Pagina caricata, procedo ad effettuare il caricamento dei dati della form...");

  //inizializzo il database
  await initDatabase();

  //mi posiziono nel punto giusto
  step1.scrollIntoView({ behavior: 'smooth', block: 'start' });
});


//Caricamento dei Comuni al cambio della Provincia
selectProvincia.addEventListener('change', e => populateCity(e.target.value));

// Maiuscolo automatico per CF
document.getElementById('cf').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });

// Gestione tasto Indietro
btnBack.addEventListener('click', () => {
  step2.style.display = 'none';
  step1.style.display = 'flex';
  step1.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const adulti = Number(document.getElementById('adulti').value);
  const minori = Number(document.getElementById('minori').value);

  // Genera campi per i partecipanti extra
  // partecipantiDiv.innerHTML = '';

  //dati partecipanti ADULTI (extra il primo)
  for (let i = 1; i < adulti; i++) {
    const p = document.createElement('div');
    p.className = 'partecipante adulto'; // Questa classe ora ha il flex-column e align-items: center nel CSS
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
    p.className = 'partecipante bambino'; // Questa classe ora ha il flex-column e align-items: center nel CSS
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

  step1.style.display = 'none';
  step2.style.display = 'flex'; // Usiamo flex per mantenere la centratura impostata nel CSS
  step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Invio Finale
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Convertiamo i numeri
  ['adulti','minori','menu1','menu2','birre'].forEach(k => {
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
    //btnSubmit.disabled = true;
    //btnSubmit.textContent = "Registrazione inviata con successo!!!";
  })
  .catch(err => {
    mostraErrore();
    //btnSubmit.disabled = false;
    //btnSubmit.textContent = "Invia registrazione";
  });

});

function mostraRisultato(res) {
  if (AppConfig.debugMode) {
    console.log("[mostraRisultato]", "Ricevuta risposta dal server ->", JSON.stringify(res));
  }

  //nascondo i vari step precedenti
  step1.style.display = 'none';
  step2.style.display = 'none';

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

  //aggiorno il messaggio
  msg.innerHTML = 'Si è verificato un errore.<br>Controlla la connessione e riprova.<br><br>'  + '<button type="button" id="btnHome" class="btn-secondary">RIPROVA</button>';
  msg.className = 'error';
  msg.style.display = 'flex';

    //rivado in home sul click
  document.getElementById('btnHome')
          .addEventListener('click', () => { location.reload(); });
}