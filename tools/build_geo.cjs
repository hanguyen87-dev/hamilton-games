// Builds data/states.json and data/world.json (SVG paths + facts) for the States, Flags and Countries games.
// Run once: npm i us-atlas@3.0.1 world-atlas@2.0.2 d3-geo@3.1.1 topojson-client@3.1.0 (anywhere), then
//   NODE_PATH=<that folder>/node_modules node tools/build_geo.cjs
const fs = require("fs"), path = require("path");
const { geoPath, geoEqualEarth } = require("d3-geo");
const { feature, merge } = require("topojson-client");
const { geoCentroid } = require("d3-geo");
const out = (f, v) => fs.writeFileSync(path.join(__dirname, "..", "data", f), JSON.stringify(v));
// Bounds and center come from the biggest piece of land, so France's frame isn't stretched to French Guiana.
const main = (f, gp) => f.geometry.type !== "MultiPolygon" ? f : { type: "Feature", geometry: { type: "Polygon", coordinates: f.geometry.coordinates.reduce((a, c) => gp.area({ type: "Polygon", coordinates: c }) > gp.area({ type: "Polygon", coordinates: a }) ? c : a) } };
const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => (+n).toFixed(1).replace(/\.0$/, ""));

// name: [postal code, capital, nickname]
const STATES = {
  Alabama: ["AL", "Montgomery", "The Yellowhammer State"], Alaska: ["AK", "Juneau", "The Last Frontier"], Arizona: ["AZ", "Phoenix", "The Grand Canyon State"],
  Arkansas: ["AR", "Little Rock", "The Natural State"], California: ["CA", "Sacramento", "The Golden State"], Colorado: ["CO", "Denver", "The Centennial State"],
  Connecticut: ["CT", "Hartford", "The Constitution State"], Delaware: ["DE", "Dover", "The First State"], Florida: ["FL", "Tallahassee", "The Sunshine State"],
  Georgia: ["GA", "Atlanta", "The Peach State"], Hawaii: ["HI", "Honolulu", "The Aloha State"], Idaho: ["ID", "Boise", "The Gem State"],
  Illinois: ["IL", "Springfield", "The Prairie State"], Indiana: ["IN", "Indianapolis", "The Hoosier State"], Iowa: ["IA", "Des Moines", "The Hawkeye State"],
  Kansas: ["KS", "Topeka", "The Sunflower State"], Kentucky: ["KY", "Frankfort", "The Bluegrass State"], Louisiana: ["LA", "Baton Rouge", "The Pelican State"],
  Maine: ["ME", "Augusta", "The Pine Tree State"], Maryland: ["MD", "Annapolis", "The Old Line State"], Massachusetts: ["MA", "Boston", "The Bay State"],
  Michigan: ["MI", "Lansing", "The Great Lakes State"], Minnesota: ["MN", "Saint Paul", "The North Star State"], Mississippi: ["MS", "Jackson", "The Magnolia State"],
  Missouri: ["MO", "Jefferson City", "The Show-Me State"], Montana: ["MT", "Helena", "The Treasure State"], Nebraska: ["NE", "Lincoln", "The Cornhusker State"],
  Nevada: ["NV", "Carson City", "The Silver State"], "New Hampshire": ["NH", "Concord", "The Granite State"], "New Jersey": ["NJ", "Trenton", "The Garden State"],
  "New Mexico": ["NM", "Santa Fe", "The Land of Enchantment"], "New York": ["NY", "Albany", "The Empire State"], "North Carolina": ["NC", "Raleigh", "The Tar Heel State"],
  "North Dakota": ["ND", "Bismarck", "The Peace Garden State"], Ohio: ["OH", "Columbus", "The Buckeye State"], Oklahoma: ["OK", "Oklahoma City", "The Sooner State"],
  Oregon: ["OR", "Salem", "The Beaver State"], Pennsylvania: ["PA", "Harrisburg", "The Keystone State"], "Rhode Island": ["RI", "Providence", "The Ocean State"],
  "South Carolina": ["SC", "Columbia", "The Palmetto State"], "South Dakota": ["SD", "Pierre", "The Mount Rushmore State"], Tennessee: ["TN", "Nashville", "The Volunteer State"],
  Texas: ["TX", "Austin", "The Lone Star State"], Utah: ["UT", "Salt Lake City", "The Beehive State"], Vermont: ["VT", "Montpelier", "The Green Mountain State"],
  Virginia: ["VA", "Richmond", "Old Dominion"], Washington: ["WA", "Olympia", "The Evergreen State"], "West Virginia": ["WV", "Charleston", "The Mountain State"],
  Wisconsin: ["WI", "Madison", "The Badger State"], Wyoming: ["WY", "Cheyenne", "The Equality State"],
};
const us = require("us-atlas/states-albers-10m.json");
const sp = geoPath();  // already projected to 975 x 610
const states = feature(us, us.objects.states).features.filter((f) => STATES[f.properties.name]).map((f) => {
  const [abbr, capital, nick] = STATES[f.properties.name];
  const [[x0, y0], [x1, y1]] = sp.bounds(f), [cx, cy] = sp.centroid(main(f, sp));
  return { name: f.properties.name, abbr, capital, nick, area: Math.round(sp.area(f)), c: [Math.round(cx), Math.round(cy)], b: [x0, y0, x1, y1].map(Math.round), d: round(sp(f)) };
}).sort((a, b) => a.name.localeCompare(b.name));
if (states.length !== 50) throw new Error("expected 50 states, got " + states.length);
out("states.json", { w: 975, h: 610, states });

// Map name in world-atlas: [name for Hamilton, ISO code (flag), capital, continent]
const COUNTRIES = {
  "United States of America": ["United States", "US", "Washington, D.C.", "North America"], Canada: ["Canada", "CA", "Ottawa", "North America"],
  Mexico: ["Mexico", "MX", "Mexico City", "North America"], Cuba: ["Cuba", "CU", "Havana", "North America"], Jamaica: ["Jamaica", "JM", "Kingston", "North America"],
  Panama: ["Panama", "PA", "Panama City", "North America"], "Costa Rica": ["Costa Rica", "CR", "San José", "North America"], Greenland: ["Greenland", "GL", "Nuuk", "North America"],
  Brazil: ["Brazil", "BR", "Brasília", "South America"], Argentina: ["Argentina", "AR", "Buenos Aires", "South America"], Chile: ["Chile", "CL", "Santiago", "South America"],
  Peru: ["Peru", "PE", "Lima", "South America"], Colombia: ["Colombia", "CO", "Bogotá", "South America"], Venezuela: ["Venezuela", "VE", "Caracas", "South America"],
  Ecuador: ["Ecuador", "EC", "Quito", "South America"], Bolivia: ["Bolivia", "BO", "La Paz", "South America"], Uruguay: ["Uruguay", "UY", "Montevideo", "South America"],
  "United Kingdom": ["United Kingdom", "GB", "London", "Europe"], France: ["France", "FR", "Paris", "Europe"], Germany: ["Germany", "DE", "Berlin", "Europe"],
  Italy: ["Italy", "IT", "Rome", "Europe"], Spain: ["Spain", "ES", "Madrid", "Europe"], Portugal: ["Portugal", "PT", "Lisbon", "Europe"],
  Ireland: ["Ireland", "IE", "Dublin", "Europe"], Netherlands: ["Netherlands", "NL", "Amsterdam", "Europe"], Belgium: ["Belgium", "BE", "Brussels", "Europe"],
  Switzerland: ["Switzerland", "CH", "Bern", "Europe"], Austria: ["Austria", "AT", "Vienna", "Europe"], Norway: ["Norway", "NO", "Oslo", "Europe"],
  Sweden: ["Sweden", "SE", "Stockholm", "Europe"], Finland: ["Finland", "FI", "Helsinki", "Europe"], Denmark: ["Denmark", "DK", "Copenhagen", "Europe"],
  Iceland: ["Iceland", "IS", "Reykjavík", "Europe"], Poland: ["Poland", "PL", "Warsaw", "Europe"], Greece: ["Greece", "GR", "Athens", "Europe"],
  Ukraine: ["Ukraine", "UA", "Kyiv", "Europe"], Russia: ["Russia", "RU", "Moscow", "Europe and Asia"], Turkey: ["Turkey", "TR", "Ankara", "Europe and Asia"],
  China: ["China", "CN", "Beijing", "Asia"], Japan: ["Japan", "JP", "Tokyo", "Asia"], "South Korea": ["South Korea", "KR", "Seoul", "Asia"],
  India: ["India", "IN", "New Delhi", "Asia"], Vietnam: ["Vietnam", "VN", "Hanoi", "Asia"], Thailand: ["Thailand", "TH", "Bangkok", "Asia"],
  Philippines: ["Philippines", "PH", "Manila", "Asia"], Indonesia: ["Indonesia", "ID", "Jakarta", "Asia"], Malaysia: ["Malaysia", "MY", "Kuala Lumpur", "Asia"],
  Mongolia: ["Mongolia", "MN", "Ulaanbaatar", "Asia"], Pakistan: ["Pakistan", "PK", "Islamabad", "Asia"], "Saudi Arabia": ["Saudi Arabia", "SA", "Riyadh", "Asia"],
  Israel: ["Israel", "IL", "Jerusalem", "Asia"], Iran: ["Iran", "IR", "Tehran", "Asia"], Nepal: ["Nepal", "NP", "Kathmandu", "Asia"],
  Egypt: ["Egypt", "EG", "Cairo", "Africa"], Kenya: ["Kenya", "KE", "Nairobi", "Africa"], Nigeria: ["Nigeria", "NG", "Abuja", "Africa"],
  "South Africa": ["South Africa", "ZA", "Pretoria", "Africa"], Morocco: ["Morocco", "MA", "Rabat", "Africa"], Ethiopia: ["Ethiopia", "ET", "Addis Ababa", "Africa"],
  Ghana: ["Ghana", "GH", "Accra", "Africa"], Madagascar: ["Madagascar", "MG", "Antananarivo", "Africa"], Tanzania: ["Tanzania", "TZ", "Dodoma", "Africa"],
  Algeria: ["Algeria", "DZ", "Algiers", "Africa"], Australia: ["Australia", "AU", "Canberra", "Oceania"], "New Zealand": ["New Zealand", "NZ", "Wellington", "Oceania"],
};
const world = require("world-atlas/countries-110m.json");
const all = feature(world, world.objects.countries).features.filter((f) => f.properties.name !== "Antarctica");
const proj = geoEqualEarth().fitExtent([[4, 4], [956, 496]], { type: "FeatureCollection", features: all });
const wp = geoPath(proj);
const countries = [], land = [];
for (const f of all) {
  const d = round(wp(f) || "");
  const info = COUNTRIES[f.properties.name];
  if (!info) { if (d) land.push(d); continue; }
  const [name, iso, capital, cont] = info, m = main(f, wp), [[x0, y0], [x1, y1]] = wp.bounds(m), [cx, cy] = wp.centroid(m);
  countries.push({ name, iso, capital, cont, area: Math.round(wp.area(f)), c: [Math.round(cx), Math.round(cy)], b: [x0, y0, x1, y1].map(Math.round), d });
}
if (countries.length !== Object.keys(COUNTRIES).length) throw new Error("missing countries: " + Object.keys(COUNTRIES).filter((k) => !countries.find((c) => c.name === COUNTRIES[k][0])));
countries.sort((a, b) => a.name.localeCompare(b.name));
// Continents for the Adventure lessons: every country in world-atlas merged into 7 shapes (no inside borders).
// Russia and Turkey are in both Europe and Asia, so they stay plain land. Antarctica sits below the 500-high map (h2 shows it).
const CONT_NAME = { "Oceania": "Australia" };
const OVERRIDE = { Russia: null, Turkey: null, Syria: "Asia", Greenland: "North America", "Papua New Guinea": "Australia", "Solomon Is.": "Australia", Vanuatu: "Australia",
  Fiji: "Australia", "New Caledonia": "Australia", "New Zealand": "Australia", Australia: "Australia", Antarctica: "Antarctica", "Fr. S. Antarctic Lands": "Antarctica" };
function continentOf(f) {
  const n = f.properties.name;
  if (Object.hasOwn(OVERRIDE, n)) return OVERRIDE[n];
  if (COUNTRIES[n]) return CONT_NAME[COUNTRIES[n][3]] || COUNTRIES[n][3];
  const [lon, lat] = geoCentroid(main(f, geoPath()));
  if (lon < -25) return lat > 13 || (lon < -77.5 && lat > 7) ? "North America" : "South America";
  if (lon < 40 && lat >= 35) return "Europe";
  if (lat < 35 && lon > -20 && lon < 52 && !(lon > 34.5 && lat > 29.5) && !(lon > 40 && lat > 12)) return "Africa";
  return "Asia";
}
const geoms = world.objects.countries.geometries, groups = {};
for (const g of geoms) { const c = continentOf({ type: "Feature", properties: g.properties, geometry: feature(world, g).geometry }); if (c) (groups[c] ||= []).push(g); }
const ORDER = ["North America", "South America", "Europe", "Africa", "Asia", "Australia", "Antarctica"];
const conts = ORDER.map((name) => {
  const m = { type: "Feature", geometry: merge(world, groups[name]) }, big = main(m, wp), [[x0, y0], [x1, y1]] = wp.bounds(m), [cx, cy] = wp.centroid(big);
  return { name, d: round(wp(m)), c: [Math.round(cx), Math.round(cy)], b: [x0, y0, x1, y1].map(Math.round) };
});
const neutral = geoms.filter((g) => continentOf({ type: "Feature", properties: g.properties, geometry: feature(world, g).geometry }) === null).map((g) => round(wp(feature(world, g))));
// Ocean label points (lon, lat), for "Which ocean has the star?"
const OCEANS = { Pacific: [-140, 0], Atlantic: [-35, 20], Indian: [78, -22], Arctic: [10, 80], Southern: [40, -60] };
const oceans = Object.fromEntries(Object.entries(OCEANS).map(([k, ll]) => [k, proj(ll).map(Math.round)]));
const h2 = Math.ceil(Math.max(...conts.map((c) => c.b[3]))) + 4;
out("world.json", { w: 960, h: 500, h2, land: land.join(""), countries, conts, neutral: neutral.join(""), oceans });
console.log("continents", conts.map((c) => `${c.name}:${groups[c.name].length}`).join(" "), "h2", h2, "oceans", JSON.stringify(oceans));
console.log("states", states.length, "countries", countries.length);
