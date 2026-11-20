"use strict";

/* The planning fields that can be published to a signed-in recipient. */

function sharedPlanData(trip) {
  const isRecord = (value) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const text = (value) => (typeof value === "string" ? value : "");
  const name = isRecord(trip) ? text(trip.name).trim() : "";
  if (!name) throw new Error("The shared plan needs a destination.");

  const records = (value) => (Array.isArray(value) ? value.filter(isRecord) : []);
  const date = (value) => {
    const day = text(value);
    const parsed = parseDate(day);
    return parsed && localDate(parsed).padStart(10, "0") === day ? day : "";
  };
  const link = (value) => {
    const address = text(value).trim();
    if (!/^https?:\/\//i.test(address)) return "";
    try {
      const url = new URL(address);
      return url.hostname && !url.username && !url.password ? address : "";
    } catch {
      return "";
    }
  };
  const details = (item) => ({
    location: text(item.location),
    cost: text(item.cost),
    hours: text(item.hours),
    website: link(item.website),
    mapLink: link(item.mapLink),
    access: text(item.access),
    note: text(item.note),
  });

  const savedPlaces = records(trip.placesToExplore ?? trip.places);
  const placesById = new Map(savedPlaces.map((place) => [place.id, place]));
  const itinerary = records(trip.itinerary)
    .map((item) => {
      const start = TripCalendar.minutes(
        typeof item.time === "number" ? item.time : text(item.time),
      );
      const hasTime = Number.isInteger(start) && start >= 0 && start < 1440;
      const minutes = Number(typeof item.duration === "number" ? item.duration : text(item.duration));
      const duration = Number.isFinite(minutes) && minutes > 0
        ? Math.max(1, Math.min(Math.round(minutes), 1440))
        : 60;
      return {
        title: text(item.title).trim(),
        date: date(item.date),
        time: hasTime ? TripCalendar.clock(start) : "",
        duration: hasTime ? Math.min(duration, 1440 - start) : duration,
        category:
          text(item.category) ||
          (item.placeId ? text(placesById.get(item.placeId)?.category) : ""),
        ...details(item),
        done: item.done === true,
      };
    })
    .filter((item) => item.title);
  const placesToExplore = savedPlaces
    .map((place) => ({
      name: text(place.name).trim(),
      category: text(place.category),
      district: text(place.district),
      ...details(place),
    }))
    .filter((place) => place.name);
  const checklist = records(trip.checklist)
    .map((item) => ({ title: text(item.title).trim(), done: item.done === true }))
    .filter((item) => item.title);

  const start = date(trip.start);
  const end = date(trip.end);
  const scene = text(trip.scene);
  return {
    name,
    country: text(trip.country),
    start,
    end: start && end >= start ? end : "",
    scene: Object.hasOwn(sceneNames, scene) ? scene : "city",
    itinerary,
    placesToExplore,
    checklist,
  };
}
