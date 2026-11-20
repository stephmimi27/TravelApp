"use strict";

/* Edit the published plan and submit only against the version that was opened. */
const SharedPlanEditor = (() => {
  const tripFields = [
    ["name", "Trip name", "text", "required"],
    ["country", "Country"],
    ["start", "Start date", "date"],
    ["end", "End date", "date"],
  ];
  const detailFields = [
    ["location", "Location or address"],
    ["category", "Category"],
    ["cost", "Cost or price range"],
    ["hours", "Opening hours"],
    ["website", "Website or booking link", "url"],
    ["mapLink", "Map link", "url"],
    ["access", "Getting there"],
    ["note", "Notes", "textarea"],
  ];
  const groups = [
    {
      key: "itinerary",
      title: "Itinerary",
      item: "Itinerary item",
      fields: [
        ["title", "Title", "text", "required"],
        ["date", "Date", "date"],
        ["time", "Start time", "time"],
        ["duration", "Duration in minutes", "number", 'required min="1" max="1440"'],
        ...detailFields,
        ["done", "Done", "checkbox"],
      ],
    },
    {
      key: "placesToExplore",
      title: "Saved places",
      item: "Saved place",
      fields: [
        ["name", "Place name", "text", "required"],
        ["district", "District or neighborhood"],
        ...detailFields,
      ],
    },
    {
      key: "checklist",
      title: "Checklist",
      item: "Checklist task",
      fields: [
        ["title", "Task", "text", "required"],
        ["done", "Done", "checkbox"],
      ],
    },
  ];

  function fields(definitions, values, prefix) {
    return definitions.map(([key, label, type = "text", attrs = ""]) => {
      const name = `shared-edit-${prefix}-${key}`;
      const value = values[key] ?? "";
      const marker = `data-edit-field="${key}"`;
      if (type === "textarea") {
        return `<div class="form-field full"><label for="${name}">${label}</label><textarea id="${name}" ${marker}>\n${esc(value)}</textarea></div>`;
      }
      if (type === "checkbox") {
        return `<label class="shared-edit-check"><input type="checkbox" ${marker} ${value ? "checked" : ""}> ${label}</label>`;
      }
      return field(label, name, value, type, `${attrs} ${marker}`);
    }).join("");
  }

  function row(group, values, index, open = false) {
    const label = values[group.fields[0][0]] || group.item;
    return `<details class="shared-edit-row" ${open ? "open" : ""}>
      <summary><span data-edit-row-label>${esc(label)}</span></summary>
      <div class="shared-edit-row-body"><div class="form-grid">${fields(group.fields, values, `${group.key}-${index}`)}</div>
      <button type="button" class="btn btn-small danger" data-edit-remove>Remove ${group.item.toLowerCase()}</button></div>
      </details>`;
  }

  function readFields(scope) {
    return Object.fromEntries([...scope.querySelectorAll("[data-edit-field]")].map((input) => [
      input.dataset.editField,
      input.type === "checkbox" ? input.checked : input.type === "number" ? input.valueAsNumber : input.value,
    ]));
  }

  function reveal(input) {
    for (let disclosure = input.closest("details"); disclosure; disclosure = disclosure.parentElement.closest("details")) {
      disclosure.open = true;
    }
  }

  function validate(form) {
    function invalid(input, message) {
      input.setCustomValidity(message);
      input.reportValidity();
      return input;
    }
    for (const input of form.querySelectorAll('input[type="text"][required]')) {
      if (!input.value.trim()) return invalid(input, "Enter a name or title.");
    }
    const start = $("[data-edit-field=start]", form);
    const end = $("[data-edit-field=end]", form);
    if (end.value && (!start.value || end.value < start.value))
      return invalid(end, "Enter a start date on or before the end date.");
    for (const item of form.querySelectorAll('[data-edit-group="itinerary"] .shared-edit-row')) {
      const time = TripCalendar.minutes($("[data-edit-field=time]", item).value);
      const duration = $("[data-edit-field=duration]", item);
      if (time !== null && time + duration.valueAsNumber > 1440)
        return invalid(duration, "Choose a duration that ends by midnight.");
    }
    for (const input of form.querySelectorAll('input[type="url"]')) {
      if (!input.value) continue;
      const url = URL.canParse(input.value) ? new URL(input.value) : null;
      if (!url?.hostname || !/^https?:\/\//i.test(input.value) || url.username || url.password)
        return invalid(input, "Enter a full website address starting with https:// or http://.");
    }
    return null;
  }

  function open(entry, { onSaved, isCurrent }) {
    if (!isCurrent()) return;
    const plan = entry.plan;
    const sections = groups.map((group) => `<details class="shared-edit-section" data-edit-group="${group.key}">
      <summary>${group.title}</summary>
      <div class="shared-edit-items" data-edit-items>${plan[group.key].map((item, index) => row(group, item, index)).join("")}</div>
      <button type="button" class="btn btn-small" data-edit-add>${ico("plus", 13)} Add ${group.item.toLowerCase()}</button>
      </details>`).join("");
    showModal(
      "Edit shared plan",
      `<fieldset class="shared-edit-fields" data-private-share>
        <legend class="sr-only">Plan fields</legend>
        <details class="shared-edit-section" open><summary>Trip details</summary>
          <div class="form-grid" data-edit-trip>${fields(tripFields, plan, "trip")}</div>
        </details>${sections}
      </fieldset>`,
      `<p class="shared-status shared-edit-status" role="status" data-edit-status></p>
      <button type="button" class="btn" data-edit-refresh hidden>Discard draft and refresh</button>
      <button type="button" class="btn" data-action="close-modal">Cancel</button>
      <button type="submit" class="btn btn-primary">Save changes</button>`,
      "shared-plan-edit-form",
    );
    const form = $("#shared-plan-edit-form");
    const current = () => isCurrent() && modal.open && form.isConnected;
    const inputs = $(".shared-edit-fields", form);
    const status = $("[data-edit-status]", form);
    const save = $('button[type="submit"]', form);
    const refresh = $("[data-edit-refresh]", form);
    let nextIndex = Math.max(...groups.map((group) => plan[group.key].length));
    let conflict = false;
    let invalidControl;

    form.addEventListener("invalid", (event) => reveal(event.target), true);
    form.addEventListener("input", (event) => {
      const input = event.target;
      if (!input.matches("[data-edit-field]")) return;
      invalidControl?.setCustomValidity("");
      invalidControl = null;
      const item = input.closest(".shared-edit-row");
      if (item && input === $("[data-edit-field]", item)) {
        const group = groups.find((group) => group.key === item.closest("[data-edit-group]").dataset.editGroup);
        $("[data-edit-row-label]", item).textContent = input.value.trim() || group.item;
      }
    });
    form.addEventListener("click", (event) => {
      const action = event.target.closest("[data-edit-add], [data-edit-remove]");
      if (!action || !current() || inputs.disabled) return;
      const section = action.closest("[data-edit-group]");
      if (action.hasAttribute("data-edit-remove")) {
        const item = action.closest(".shared-edit-row");
        const neighbor = item.nextElementSibling || item.previousElementSibling;
        item.remove();
        (neighbor?.querySelector("summary") || $("[data-edit-add]", section)).focus();
      } else {
        const group = groups.find((group) => group.key === section.dataset.editGroup);
        const items = $("[data-edit-items]", section);
        items.insertAdjacentHTML("beforeend", row(group, { date: $("[data-edit-field=start]", form).value, duration: 60 }, nextIndex++, true));
        $("input", items.lastElementChild).focus();
      }
    });
    refresh.addEventListener("click", () => {
      if (!current()) return;
      closeModal();
      onSaved();
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!current() || save.disabled) return;
      invalidControl = validate(form);
      if (invalidControl) return;
      const edited = { ...readFields($("[data-edit-trip]", form)), scene: plan.scene };
      for (const group of groups) {
        const details = $(`[data-edit-group="${group.key}"]`, form);
        edited[group.key] = [...details.querySelectorAll(".shared-edit-row")].map(readFields);
      }
      inputs.disabled = true;
      save.disabled = true;
      status.textContent = "Saving changes…";
      try {
        const revision = await SharedPlans.edit(entry.id, edited, entry.revision);
        if (revision === null) {
          conflict = true;
          if (!current()) return;
          status.textContent = "The plan or your access changed while you were editing. Your draft is still open. Copy any edits you want to keep before refreshing.";
          refresh.hidden = false;
          return;
        }
        if (current()) closeModal();
        if (isCurrent()) onSaved();
      } catch (error) {
        if (current()) status.textContent = error.message || "Couldn’t save changes. Try again.";
      } finally {
        inputs.disabled = false;
        save.disabled = conflict;
      }
    });
  }

  return { open };
})();
