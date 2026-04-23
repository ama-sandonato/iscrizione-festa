const AppConfig = (() => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "172.28.16.1";
    const isGitHubPages = window.location.hostname.includes("ama-sandonato.github.io");

    return {
        apiUrl: isGitHubPages ? "https://script.google.com/macros/s/AKfycbywhbbHNVrJIKJSH0RJ5sllwp-khgMkKK0zhP9_pMNWHMi__P_3SoTxPCpl0lVJ99gW/exec" : "http://localhost:8080/api/invio-form",
        debugMode: isLocal,
        timeout: isLocal ? 1000 : 5000
    };
})();


function loadProvince() {
    fetch('./resources/provinces.json')
    .then(response => response.json())
    .then(data => {
      selectProvincia.innerHTML = '<option value="">Seleziona provincia</option>';
      // L'API restituisce un array di oggetti, solitamente con 'code' e 'description' (o simili)
      // Adattiamo in base alla struttura reale dell'API
      data.forEach(prov => {
        const option = document.createElement('option');
        option.value = prov.id; // Il codice (es. MI)
        option.textContent = prov.name; // Il nome (es. Milano)
        selectProvincia.appendChild(option);
      });
    })
    .catch(err => {
      console.error("Errore caricamento province:", err);
      selectProvincia.innerHTML = '<option value="">Errore nel caricamento</option>';
    });
}


function loadCitta(provCode) {
    // const provCode = this.value;
  
    // Reset campo città
    selectCitta.innerHTML = '<option value="">Caricamento comuni...</option>';
    selectCitta.disabled = true;
  
    if (provCode) {
      fetch(`./resources/${provCode.toLowerCase()}-towns.min.json`)
        .then(response => response.json())
        .then(data => {
          selectCitta.innerHTML = '<option value="">Seleziona città</option>';
          selectCitta.disabled = false;
  
          data.forEach(town => {
            const option = document.createElement('option');
            // Nota: usa 'description' o 'name' in base a cosa restituisce l'API per i comuni
            option.value = town.name; 
            option.textContent = town.name;
            selectCitta.appendChild(option);
          });
        })
        .catch(err => {
          console.error("Errore caricamento comuni:", err);
          selectCitta.innerHTML = '<option value="">Errore nel caricamento</option>';
        });
    } else {
      selectCitta.innerHTML = '<option value="">Seleziona prima una provincia</option>';
    }
}