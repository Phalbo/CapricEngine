<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Permette richieste da qualsiasi origine (per test). In produzione, restringi al tuo dominio.
header('Access-Control-Allow-Methods: GET');

$counterFile = 'caprice_count.txt';
$currentCount = 0;

// Blocco del file per evitare race conditions (letture/scritture concorrenti)
$fp = fopen($counterFile, 'c+'); // Apre per lettura/scrittura; crea se non esiste; puntatore all'inizio

if (flock($fp, LOCK_EX)) { // Ottiene un blocco esclusivo
    $filesize = filesize($counterFile);
    if ($filesize > 0) {
        $currentCount = (int)fread($fp, $filesize);
    } else {
        // Se il file è vuoto o appena creato, inizializza a 0 (o al numero da cui vuoi partire)
        $currentCount = 0; 
    }

    $currentCount++; // Incrementa il contatore

    ftruncate($fp, 0); // Tronca il file a zero lunghezza
    rewind($fp);       // Riporta il puntatore all'inizio
    fwrite($fp, (string)$currentCount); // Scrive il nuovo valore
    fflush($fp);       // Assicura che i dati siano scritti su disco
    flock($fp, LOCK_UN); // Rilascia il blocco
} else {
    // Non è stato possibile ottenere il blocco, restituisci un errore o un valore di default
    // Questo è un caso limite, ma è bene gestirlo.
    // Potresti voler restituire l'ultimo valore noto senza incrementarlo o un messaggio di errore.
    // Per semplicità, qui potremmo restituire 0 o l'ultimo valore letto se disponibile.
    // Tuttavia, per un contatore che deve essere strettamente progressivo, questo caso andrebbe gestito con più attenzione.
    // Per ora, se il blocco fallisce, non incrementiamo e proviamo a restituire l'ultimo valore letto (se letto).
    // Oppure, potremmo semplicemente uscire con un errore HTTP.
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Impossibile bloccare il file contatore.']);
    fclose($fp);
    exit;
}

fclose($fp);

echo json_encode(['nextCapriceNumber' => $currentCount]);
?>