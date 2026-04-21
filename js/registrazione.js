const GAS_URL = "https://script.google.com/macros/s/AKfycbywhbbHNVrJIKJSH0RJ5sllwp-khgMkKK0zhP9_pMNWHMi__P_3SoTxPCpl0lVJ99gW/exec";
                    
const form = document.getElementById('regForm');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const partecipantiDiv = document.getElementById('partecipanti');
const btnNext = document.getElementById('btnNext');
const btnBack = document.getElementById('btnBack');
const msg = document.getElementById('msg');

window.addEventListener("load", () => {
    console.log("Pagina caricata, procedo ad effettuare il caricamento dei dati della form...");
    
});


// Maiuscolo automatico per CF
document.getElementById('cf').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase();
});

// Gestione tasto Indietro
btnBack.addEventListener('click', () => {
  step2.style.display = 'none';
  step1.style.display = 'flex';
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
  const tot = adulti + minori;

  // Genera campi per i partecipanti extra
  partecipantiDiv.innerHTML = '';
  for (let i = 1; i < tot; i++) {
    const p = document.createElement('div');
    p.className = 'partecipante'; // Questa classe ora ha il flex-column e align-items: center nel CSS
    p.innerHTML = `
      <h3>Partecipante ${i+1}</h3>
      <div class="grid">
        <div>
          <label>Nome *</label>
          <input type="text" name="nomeP${i}" required>
        </div>
        <div>
          <label>Cognome *</label>
          <input type="text" name="cognomeP${i}" required>
        </div>
      </div>
    `;
    partecipantiDiv.appendChild(p);
  }  
  step1.style.display = 'none';
  step2.style.display = 'flex'; // Usiamo flex per mantenere la centratura impostata nel CSS
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
  const tot = adulti + minori;
  
  data.partecipanti = [];
  for (let i = 1; i < tot; i++) {
    data.partecipanti.push({
      nome: formData.get(`nomeP${i}`),
      cognome: formData.get(`cognomeP${i}`)
    });
  }

  // Mostra caricamento sul bottone
  const btnSubmit = document.getElementById('btnSubmit');
  btnSubmit.disabled = true;
  btnSubmit.textContent = "Invio in corso...";
  
  console.log("Invio i dati al server:", JSON.stringify(data));

  fetch(GAS_URL, {
    method: 'POST',
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({
      action: "registraNuovoIscritto", // AGGIUNTE LE VIRGOLETTE QUI
      formData: data
    })
  })
  .then(res => res.json())
  .then(res => {
    mostraRisultato(res);
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Invia registrazione";
  })
  .catch(err => {
    mostraErrore();
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Invia registrazione";
  });

});

function mostraRisultato(res) {
  msg.textContent = 'Registrazione inviata con successo! Ti aspettiamo.';
  msg.className = 'success';
  msg.style.display = 'block';
  form.reset();
  setTimeout(() => {
      location.reload(); // Ricarica la pagina per pulire tutto dopo 3 secondi
  }, 3000);
}

function mostraErrore() {
  msg.textContent = 'Si è verificato un errore. Controlla la connessione e riprova.';
  msg.className = 'error';
  msg.style.display = 'block';
}