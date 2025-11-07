let trainers = [];
const locationCache = {};

// Load trainers from JSON
fetch('data/trainers.json')
  .then(r => r.json())
  .then(data => {
    trainers = data;
    trainers.forEach(t => locationCache[t.zip] = { lat: t.lat, lon: t.lon });
  });

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function getLocation(zip) {
  if (locationCache[zip]) return locationCache[zip];
  const url = `http://api.zippopotam.us/us/${zip}`;
  try {
    const r = await fetch(url);
    const d = await r.json();
    if (d.places?.[0]) {
      const lat = parseFloat(d.places[0].latitude);
      const lon = parseFloat(d.places[0].longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        locationCache[zip] = { lat, lon };
        return { lat, lon };
      }
    }
  } catch(e) {}
  return null;
}

async function findTrainers() {
  const userZip = document.getElementById('zipcode').value.trim();
  const results = document.getElementById('results');

  if (!/^\d{5}$/.test(userZip)) {
    results.innerHTML = '<p class="error">Please enter a valid 5-digit ZIP code.</p>';
    return;
  }
  results.innerHTML = '<p class="loading">Finding trainers near you...</p>';

  const userLoc = await getLocation(userZip);
  const inPerson = [];
  const allOnline = [];

  for (const t of trainers) {
    const trainerLoc = locationCache[t.zip];
    if (userLoc && trainerLoc) {
      const dist = calculateDistance(userLoc.lat, userLoc.lon, trainerLoc.lat, trainerLoc.lon);
      const rounded = Math.round(dist);
      if (dist <= 50) inPerson.push({ ...t, distance: rounded });
      allOnline.push({ ...t, distance: rounded });
    }
  }

  inPerson.sort((a,b) => a.distance - b.distance);
  allOnline.sort((a,b) => a.distance - b.distance);

  let html = '';
  if (inPerson.length) {
    html += `<h3>In-Person Training (within 50 miles)</h3><ul>`;
    inPerson.forEach(t => html += renderTrainer(t, false));
    html += `</ul>`;
  } else {
    html += `<p><em>No in-person trainers within 50 miles.</em></p>`;
  }

  html += `<h3>Online Training (sorted by distance)</h3><ul>`;
  allOnline.forEach(t => html += renderTrainer(t, true));
  html += `</ul>`;

  results.innerHTML = html;
}

function renderTrainer(t, isOnline) {
  const profileLink = `trainers/${t.slug}.html`;
  return `
    <li class="${isOnline ? 'online' : ''}">
      <img src="${t.image}" alt="${t.name} photo" class="trainer-photo">
      <a href="${profileLink}" class="trainer-name">${t.name}</a>
      <span class="trainer-blurb">${t.blurb}</span>
      <div class="info-row">
        <span>${t.region}</span>
        <span class="distance">${t.distance} miles${isOnline ? ' away' : ''}</span>
        <span class="timezone">${t.timezone}</span>
      </div>
      <em class="price">${t.price}/session${isOnline ? ' • Live video' : ''}</em>
      <div class="btn-group">
        <a href="${profileLink}#book" class="btn btn-book">Book Now</a>
        <a href="${profileLink}" class="btn btn-profile">View Profile</a>
      </div>
    </li>`;
}
