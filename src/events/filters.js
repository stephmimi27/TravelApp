"use strict";

/* Journal search and filtering events. */

document.addEventListener("input", (e) => {
  if (e.target.id === "journal-search") {
    journalSearch = e.target.value;
    updateJournalResults();
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "journal-trip") {
    journalTrip = e.target.value;
    updateJournalResults();
  }
});
