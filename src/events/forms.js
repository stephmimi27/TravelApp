"use strict";

/* Form submissions and saved-state updates. */

document.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target,
    fd = new FormData(form),
    tid = form.dataset.trip,
    id = form.dataset.id;
  const submit = $('button[type="submit"]', form);
  if (submit) submit.disabled = true;
  try {
    if (await Planner.submit(form, fd)) return;
    if (form.id === "trip-form") {
      const start = fd.get("start"),
        end = fd.get("end");
      if (end && !start) {
        toast("Add a start date.");
        return;
      }
      if (start && end && end < start) {
        toast("The last day needs to come after the first.");
        return;
      }
      const lat = fd.get("lat"),
        lon = fd.get("lon");
      if ((lat === "") !== (lon === "")) {
        toast("Add both coordinates, or leave both empty.");
        return;
      }
      const vals = {
        name: fd.get("name").trim(),
        country: fd.get("country").trim(),
        status: fd.get("status"),
        scene: fd.get("scene"),
        start,
        end,
        reflection: fd.get("reflection").trim(),
        budget: Number(fd.get("budget")) || 0,
        currency: fd.get("currency"),
        lat: lat === "" ? null : Number(lat),
        lon: lon === "" ? null : Number(lon),
      };
      if (!vals.name || !vals.country) {
        toast("Enter a destination and country.");
        return;
      }
      const newId = tid || uid();
      const ok = await mutate(
        (s) => {
          if (tid)
            Object.assign(
              s.trips.find((t) => t.id === tid),
              vals,
            );
          else
            s.trips.push(
              baseTrip({
                ...vals,
                id: newId,
                checklist:
                  vals.status === "upcoming"
                    ? [
                        {
                          id: uid(),
                          title: "Book a place to stay",
                          done: false,
                        },
                        { id: uid(), title: "Plan transport", done: false },
                        { id: uid(), title: "Pack luggage", done: false },
                      ]
                    : [],
              }),
            );
        },
        tid ? "Trip updated." : "Trip added.",
      );
      if (ok) {
        closeModal();
        navigate(
          vals.status === "visited" ? `#trip/${newId}` : `#planner/${newId}`,
        );
      }
    }
    if (form.id === "memory-form") {
      const tripId = id ? tid : fd.get("trip"),
        vals = {
          title: fd.get("title").trim(),
          date: fd.get("date"),
          text: fd.get("text").trim(),
          feeling: fd.get("feeling"),
          media: pendingMemoryMedia,
          mediaType: pendingMemoryType,
        };
      if (!vals.title) {
        toast("Enter a title.");
        return;
      }
      const ok = await mutate((s) => {
        const t = s.trips.find((t) => t.id === tripId);
        if (id)
          Object.assign(
            t.memories.find((m) => m.id === id),
            vals,
          );
        else t.memories.push({ id: uid(), favorite: false, ...vals });
      }, "Memory saved.");
      if (ok) {
        closeModal();
        navigate(`#trip/${tripId}`);
      }
    }
    if (form.id === "stop-form") {
      const vals = {
        title: fd.get("title").trim(),
        date: fd.get("date"),
        time: fd.get("time"),
        duration: TripCalendar.duration(fd.get("duration")),
        note: fd.get("note").trim(),
        location: fd.get("location").trim(),
        cost: fd.get("cost").trim(),
        hours: fd.get("hours").trim(),
        placeId: form.dataset.place || "",
        category: form.dataset.category || "",
        website: form.dataset.website || "",
        mapLink: form.dataset.mapLink || "",
        access: form.dataset.access || "",
      };
      if (!vals.title) return;
      const start = TripCalendar.minutes(vals.time);
      if (start !== null && start + vals.duration > 1440) {
        toast(
          "The item must end by midnight. Reduce its duration or add a separate item on the next day.",
        );
        return;
      }
      const ok = await mutate((s) => {
        const t = s.trips.find((t) => t.id === tid);
        if (id)
          Object.assign(
            t.itinerary.find((i) => i.id === id),
            vals,
          );
        else t.itinerary.push({ id: uid(), done: false, ...vals });
      }, "Itinerary updated.");
      if (ok) {
        selectedDay[tid] = vals.date;
        closeModal();
        render();
      }
    }
    if (form.id === "checklist-form") {
      const title = fd.get("title").trim();
      if (title)
        await mutate((s) =>
          s.trips
            .find((t) => t.id === tid)
            .checklist.push({ id: uid(), title, done: false }),
        );
    }
    if (form.id === "expense-form") {
      const label = fd.get("label").trim(),
        amount = Number(fd.get("amount"));
      if (label && amount > 0) {
        if (
          await mutate(
            (s) =>
              s.trips
                .find((t) => t.id === tid)
                .expenses.push({ id: uid(), label, amount }),
            "Expense saved.",
          )
        )
          closeModal();
      }
    }
  } catch (err) {
    toast("Something interrupted that change. Please try again.");
    console.error(err);
  } finally {
    if (submit) submit.disabled = false;
  }
});
