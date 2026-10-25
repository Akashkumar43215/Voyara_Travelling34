/**
 * Additional curated landmarks for major tourist cities.
 *
 * Each row: [wikipediaTitle, slug, name, city, state, stateSlug, lat, lon, kind, description]
 *
 * `wikipediaTitle` is only used by scripts/fetchCuratedImages.js to pick an
 * accurate photo; the finished photos live in Cloudinary under
 * voyara/places-v2/<slug> and are attached by the seed script.
 *
 * kind: heritage | religious | nature | landmark | cultural
 */

const SOURCE_BY_KIND = {
  heritage: "Curated Heritage",
  religious: "Curated Cultural",
  nature: "Curated Nature",
  landmark: "Curated Landmarks",
  cultural: "Curated Cultural",
};

const CATEGORIES_BY_KIND = {
  heritage: ["tourism", "heritage", "landmarks", "attraction"],
  religious: ["tourism", "heritage", "cultural attractions", "attraction"],
  nature: ["tourism", "natural", "attraction"],
  landmark: ["tourism", "landmarks", "attraction"],
  cultural: ["tourism", "cultural attractions", "museum", "attraction"],
};

const ROWS = [
  // ---------- Rajasthan ----------
  ["City Palace, Udaipur", "city-palace-udaipur", "City Palace Udaipur", "Udaipur", "Rajasthan", "rajasthan", 24.5764, 73.6835, "heritage", "A grand complex of palaces and courtyards on the banks of Lake Pichola, built over 400 years by the Mewar dynasty."],
  ["Lake Pichola", "lake-pichola", "Lake Pichola", "Udaipur", "Rajasthan", "rajasthan", 24.5726, 73.6791, "nature", "The artificial freshwater lake of Udaipur, ringed by palaces, ghats and hills and home to the floating Lake Palace."],
  ["Jaisalmer Fort", "jaisalmer-fort", "Jaisalmer Fort", "Jaisalmer", "Rajasthan", "rajasthan", 26.9124, 70.9129, "heritage", "A living golden sandstone fort rising from the Thar Desert, with havelis, temples and shops inside its walls."],
  ["Jantar Mantar, Jaipur", "jantar-mantar-jaipur", "Jantar Mantar Jaipur", "Jaipur", "Rajasthan", "rajasthan", 26.9248, 75.8246, "heritage", "An 18th-century astronomical observatory of giant stone instruments, listed as a UNESCO World Heritage Site."],
  ["Pushkar Lake", "pushkar-lake", "Pushkar Lake", "Pushkar", "Rajasthan", "rajasthan", 26.4875, 74.5513, "religious", "A sacred lake surrounded by 52 bathing ghats and temples, famous for the annual Pushkar Camel Fair."],
  ["Ranthambore National Park", "ranthambore-national-park", "Ranthambore National Park", "Sawai Madhopur", "Rajasthan", "rajasthan", 26.0173, 76.5026, "nature", "One of India's best places to spot wild tigers, set around a ruined hilltop fort."],
  ["Chittorgarh Fort", "chittorgarh-fort", "Chittorgarh Fort", "Chittorgarh", "Rajasthan", "rajasthan", 24.8887, 74.6469, "heritage", "India's largest fort, a sprawling hilltop citadel full of palaces, towers and tales of Rajput valour."],
  ["Jal Mahal", "jal-mahal", "Jal Mahal", "Jaipur", "Rajasthan", "rajasthan", 26.9535, 75.8461, "heritage", "A palace that seems to float in the middle of Man Sagar Lake, framed by the Aravalli hills."],

  // ---------- Uttar Pradesh ----------
  ["Agra Fort", "agra-fort", "Agra Fort", "Agra", "Uttar Pradesh", "uttar-pradesh", 27.1795, 78.0211, "heritage", "The red sandstone Mughal fortress on the Yamuna, a UNESCO World Heritage Site just upriver from the Taj Mahal."],
  ["Fatehpur Sikri", "fatehpur-sikri", "Fatehpur Sikri", "Agra", "Uttar Pradesh", "uttar-pradesh", 27.0940, 77.6679, "heritage", "Emperor Akbar's abandoned red sandstone capital, with the towering Buland Darwaza and finely carved palaces."],
  ["Dhamek Stupa", "dhamek-stupa", "Dhamek Stupa, Sarnath", "Varanasi", "Uttar Pradesh", "uttar-pradesh", 25.3814, 83.0243, "religious", "The great Buddhist stupa at Sarnath, where the Buddha is said to have given his first sermon."],
  ["Kashi Vishwanath Temple", "kashi-vishwanath-temple", "Kashi Vishwanath Temple", "Varanasi", "Uttar Pradesh", "uttar-pradesh", 25.3109, 83.0107, "religious", "One of the most sacred Shiva temples in India, standing beside the Ganga in the heart of Varanasi."],

  // ---------- Delhi ----------
  ["Humayun's Tomb", "humayuns-tomb", "Humayun's Tomb", "New Delhi", "Delhi", "delhi", 28.5933, 77.2507, "heritage", "The elegant garden tomb that inspired the Taj Mahal, and a UNESCO World Heritage Site."],
  ["Lotus Temple", "lotus-temple", "Lotus Temple", "New Delhi", "Delhi", "delhi", 28.5535, 77.2588, "religious", "A lotus-shaped Bahá'í House of Worship of white marble petals, open to people of all faiths."],
  ["Akshardham (Delhi)", "akshardham-delhi", "Akshardham Temple", "New Delhi", "Delhi", "delhi", 28.6127, 77.2773, "religious", "A vast modern temple complex of pink sandstone and marble, famed for its carvings, exhibitions and evening water show."],
  ["Jama Masjid, Delhi", "jama-masjid-delhi", "Jama Masjid", "Delhi", "Delhi", "delhi", 28.6507, 77.2334, "religious", "One of India's largest mosques, built by Shah Jahan, with sweeping views of Old Delhi from its minarets."],
  ["Gurudwara Bangla Sahib", "gurudwara-bangla-sahib", "Gurudwara Bangla Sahib", "New Delhi", "Delhi", "delhi", 28.6264, 77.2092, "religious", "A golden-domed Sikh gurdwara with a sacred sarovar, known for its peaceful kirtan and community kitchen."],

  // ---------- Maharashtra ----------
  ["Gateway of India", "gateway-of-india", "Gateway of India", "Mumbai", "Maharashtra", "maharashtra", 18.9220, 72.8347, "landmark", "Mumbai's waterfront arch of yellow basalt, built in 1924 and the city's most recognised monument."],
  ["Ajanta Caves", "ajanta-caves", "Ajanta Caves", "Aurangabad", "Maharashtra", "maharashtra", 20.5519, 75.7033, "heritage", "Rock-cut Buddhist caves with exquisite ancient paintings and sculpture, a UNESCO World Heritage Site."],
  ["Ellora Caves", "ellora-caves", "Ellora Caves", "Aurangabad", "Maharashtra", "maharashtra", 20.0268, 75.1790, "heritage", "A remarkable group of Buddhist, Hindu and Jain rock-cut temples, including the monolithic Kailasa Temple."],
  ["Marine Drive, Mumbai", "marine-drive-mumbai", "Marine Drive", "Mumbai", "Maharashtra", "maharashtra", 18.9440, 72.8231, "landmark", "Mumbai's curving seafront promenade, the Queen's Necklace, loved for its sunsets and sea breeze."],
  ["Elephanta Caves", "elephanta-caves", "Elephanta Caves", "Mumbai", "Maharashtra", "maharashtra", 18.9633, 72.9315, "heritage", "Rock-cut temples to Shiva on an island in Mumbai harbour, with the famous Trimurti sculpture."],
  ["Chhatrapati Shivaji Terminus", "chhatrapati-shivaji-terminus", "Chhatrapati Shivaji Terminus", "Mumbai", "Maharashtra", "maharashtra", 18.9398, 72.8354, "heritage", "A Victorian Gothic railway station and UNESCO World Heritage Site, among the finest buildings in Mumbai."],

  // ---------- Goa ----------
  ["Calangute", "calangute-beach", "Calangute Beach", "Calangute", "Goa", "goa", 15.5440, 73.7553, "nature", "Goa's most popular beach, a long golden stretch lined with shacks, water sports and nightlife."],
  ["Chapora Fort", "chapora-fort", "Chapora Fort", "Vagator", "Goa", "goa", 15.6054, 73.7366, "heritage", "A ruined laterite fort on a hill above the Chapora river, with sweeping views of Vagator beach."],
  ["Palolem Beach", "palolem-beach", "Palolem Beach", "Canacona", "Goa", "goa", 15.0100, 74.0232, "nature", "A calm crescent of white sand in South Goa, ringed by palms and known for its laid-back huts and sunsets."],
  ["Se Cathedral", "se-cathedral-goa", "Se Cathedral", "Old Goa", "Goa", "goa", 15.5009, 73.9116, "religious", "One of Asia's largest churches, a grand Portuguese-Manueline cathedral in Old Goa."],

  // ---------- Kerala ----------
  ["Kovalam", "kovalam-beach", "Kovalam Beach", "Thiruvananthapuram", "Kerala", "kerala", 8.4004, 76.9787, "nature", "A crescent-shaped beach with a lighthouse, popular for swimming, surfing and Ayurvedic retreats."],
  ["Periyar National Park", "periyar-national-park", "Periyar National Park", "Thekkady", "Kerala", "kerala", 9.4650, 77.2342, "nature", "A wildlife reserve of forest and lake in the Western Ghats, known for elephants and boat safaris."],
  ["Padmanabhaswamy Temple", "padmanabhaswamy-temple", "Padmanabhaswamy Temple", "Thiruvananthapuram", "Kerala", "kerala", 8.4828, 76.9439, "religious", "A Dravidian-style Vishnu temple with a towering gopuram, one of the wealthiest temples in the world."],
  ["Varkala", "varkala-cliff", "Varkala Cliff & Beach", "Varkala", "Kerala", "kerala", 8.7379, 76.7163, "nature", "Dramatic red cliffs overlooking the Arabian Sea, with cafes, yoga retreats and a sacred beach."],

  // ---------- Karnataka ----------
  ["Bangalore Palace", "bangalore-palace", "Bangalore Palace", "Bengaluru", "Karnataka", "karnataka", 12.9987, 77.5921, "heritage", "A tudor-style palace modelled on Windsor Castle, with wood-panelled halls and lush gardens."],
  ["Gol Gumbaz", "gol-gumbaz", "Gol Gumbaz", "Vijayapura", "Karnataka", "karnataka", 16.8302, 75.7356, "heritage", "A massive 17th-century mausoleum with one of the largest domes in the world and a famous whispering gallery."],
  ["Badami cave temples", "badami-cave-temples", "Badami Cave Temples", "Badami", "Karnataka", "karnataka", 15.9186, 75.6767, "heritage", "Rock-cut cave temples from the 6th century carved into red sandstone cliffs above a lake."],
  ["Jog Falls", "jog-falls", "Jog Falls", "Shimoga", "Karnataka", "karnataka", 14.2294, 74.8125, "nature", "One of India's highest plunge waterfalls, at its most spectacular during the monsoon."],

  // ---------- Tamil Nadu ----------
  ["Marina Beach", "marina-beach", "Marina Beach", "Chennai", "Tamil Nadu", "tamil-nadu", 13.0500, 80.2824, "nature", "One of the longest urban beaches in the world, a lively promenade along Chennai's Bay of Bengal coast."],
  ["Kapaleeshwarar Temple", "kapaleeshwarar-temple", "Kapaleeshwarar Temple", "Chennai", "Tamil Nadu", "tamil-nadu", 13.0337, 80.2698, "religious", "A colourful 7th-century Dravidian Shiva temple in Mylapore, crowned by a tall sculpted gopuram."],
  ["Shore Temple", "shore-temple-mahabalipuram", "Shore Temple, Mahabalipuram", "Mahabalipuram", "Tamil Nadu", "tamil-nadu", 12.6162, 80.1993, "heritage", "A granite temple of the Pallava dynasty on the Bay of Bengal shore, a UNESCO World Heritage Site."],
  ["Ramanathaswamy Temple", "ramanathaswamy-temple", "Ramanathaswamy Temple", "Rameswaram", "Tamil Nadu", "tamil-nadu", 9.2881, 79.3174, "religious", "A major Shiva temple famed for its longest corridor of carved pillars in India."],
  ["Vivekananda Rock Memorial", "vivekananda-rock-memorial", "Vivekananda Rock Memorial", "Kanyakumari", "Tamil Nadu", "tamil-nadu", 8.0786, 77.5553, "landmark", "A memorial on a rock island off the southern tip of India, where three seas meet."],

  // ---------- Telangana & Andhra Pradesh ----------
  ["Charminar", "charminar", "Charminar", "Hyderabad", "Telangana", "telangana", 17.3616, 78.4747, "heritage", "The iconic four-minaret monument of 1591 at the heart of Hyderabad's old city and bazaars."],
  ["Golconda Fort", "golconda-fort", "Golconda Fort", "Hyderabad", "Telangana", "telangana", 17.3833, 78.4011, "heritage", "A medieval hilltop fortress of the Qutb Shahi dynasty, known for its acoustics and diamond history."],
  ["Hussain Sagar", "hussain-sagar", "Hussain Sagar Lake", "Hyderabad", "Telangana", "telangana", 17.4239, 78.4738, "nature", "A heart-shaped lake in the middle of Hyderabad, with a giant monolithic Buddha statue on an island."],
  ["Tirumala Venkateswara Temple", "tirumala-venkateswara-temple", "Tirumala Venkateswara Temple", "Tirupati", "Andhra Pradesh", "andhra-pradesh", 13.6833, 79.3472, "religious", "One of the most visited pilgrimage sites in the world, a hilltop temple dedicated to Lord Venkateswara."],
  ["Araku Valley", "araku-valley", "Araku Valley", "Visakhapatnam", "Andhra Pradesh", "andhra-pradesh", 18.3273, 82.8775, "nature", "A cool hill station of coffee plantations, tribal villages and misty valleys in the Eastern Ghats."],
  ["Borra Caves", "borra-caves", "Borra Caves", "Visakhapatnam", "Andhra Pradesh", "andhra-pradesh", 18.2802, 82.9748, "nature", "Millions of years old limestone caves with striking stalactites and stalagmites."],

  // ---------- West Bengal ----------
  ["Victoria Memorial, Kolkata", "victoria-memorial-kolkata", "Victoria Memorial", "Kolkata", "West Bengal", "west-bengal", 22.5448, 88.3426, "heritage", "A white marble museum and memorial set in landscaped gardens, the grandest landmark of Kolkata."],
  ["Howrah Bridge", "howrah-bridge", "Howrah Bridge", "Kolkata", "West Bengal", "west-bengal", 22.5851, 88.3468, "landmark", "A giant cantilever bridge over the Hooghly river and one of the busiest in the world."],
  ["Darjeeling Himalayan Railway", "darjeeling-himalayan-railway", "Darjeeling Himalayan Railway", "Darjeeling", "West Bengal", "west-bengal", 27.0360, 88.2627, "heritage", "The famous 'Toy Train' climbing through tea gardens and mountain towns, a UNESCO World Heritage Site."],
  ["Sundarbans", "sundarbans", "Sundarbans", "Canning", "West Bengal", "west-bengal", 21.9497, 89.1833, "nature", "The world's largest mangrove forest and home of the Royal Bengal tiger."],

  // ---------- Gujarat ----------
  ["Great Rann of Kutch", "rann-of-kutch", "Great Rann of Kutch", "Kutch", "Gujarat", "gujarat", 23.8333, 69.8333, "nature", "A vast white salt desert that glows under the moon, host to the Rann Utsav festival."],
  ["Somnath temple", "somnath-temple", "Somnath Temple", "Veraval", "Gujarat", "gujarat", 20.8880, 70.4012, "religious", "A sacred Shiva temple on the Arabian Sea coast, one of the twelve Jyotirlingas."],
  ["Gir National Park", "gir-national-park", "Gir National Park", "Junagadh", "Gujarat", "gujarat", 21.1243, 70.8242, "nature", "The only place in the world outside Africa where wild lions roam free."],
  ["Sabarmati Ashram", "sabarmati-ashram", "Sabarmati Ashram", "Ahmedabad", "Gujarat", "gujarat", 23.0607, 72.5800, "cultural", "Mahatma Gandhi's former home on the Sabarmati river, now a museum of his life and the freedom movement."],

  // ---------- Madhya Pradesh ----------
  ["Khajuraho Group of Monuments", "khajuraho-temples", "Khajuraho Temples", "Khajuraho", "Madhya Pradesh", "madhya-pradesh", 24.8318, 79.9199, "heritage", "Medieval Hindu and Jain temples famed for their intricate sculptures, a UNESCO World Heritage Site."],
  ["Sanchi Stupa", "sanchi-stupa", "Sanchi Stupa", "Sanchi", "Madhya Pradesh", "madhya-pradesh", 23.4793, 77.7396, "religious", "One of the oldest stone structures in India, a great Buddhist stupa with carved gateways."],
  ["Gwalior Fort", "gwalior-fort", "Gwalior Fort", "Gwalior", "Madhya Pradesh", "madhya-pradesh", 26.2306, 78.1691, "heritage", "A towering hill fort with palaces, temples and sweeping views of the city."],

  // ---------- Himachal Pradesh & Uttarakhand ----------
  ["Rohtang Pass", "rohtang-pass", "Rohtang Pass", "Manali", "Himachal Pradesh", "himachal-pradesh", 32.3716, 77.2466, "nature", "A high mountain pass above Manali with snow, glaciers and panoramic Himalayan views."],
  ["The Ridge, Shimla", "the-ridge-shimla", "The Ridge, Shimla", "Shimla", "Himachal Pradesh", "himachal-pradesh", 31.1045, 77.1734, "landmark", "Shimla's open promenade with colonial buildings, Christ Church and views of the snowy peaks."],
  ["Key Monastery", "key-monastery", "Key Monastery", "Spiti", "Himachal Pradesh", "himachal-pradesh", 32.2967, 78.0108, "religious", "A hilltop Tibetan Buddhist monastery in the cold desert valley of Spiti."],
  ["Lakshman Jhula", "lakshman-jhula", "Lakshman Jhula", "Rishikesh", "Uttarakhand", "uttarakhand", 30.1264, 78.3299, "landmark", "An iron suspension bridge over the Ganga, in the yoga capital of the world."],
  ["Har Ki Pauri", "har-ki-pauri", "Har Ki Pauri", "Haridwar", "Uttarakhand", "uttarakhand", 29.9567, 78.1695, "religious", "The most sacred ghat of Haridwar, famous for the evening Ganga Aarti."],
  ["Jim Corbett National Park", "jim-corbett-national-park", "Jim Corbett National Park", "Ramnagar", "Uttarakhand", "uttarakhand", 29.5300, 78.7747, "nature", "India's oldest national park, home to tigers, elephants and rich Himalayan foothill forest."],
  ["Valley of Flowers National Park", "valley-of-flowers", "Valley of Flowers", "Chamoli", "Uttarakhand", "uttarakhand", 30.7280, 79.6050, "nature", "A high-altitude valley carpeted with wildflowers in monsoon, a UNESCO World Heritage Site."],

  // ---------- Punjab ----------
  ["Golden Temple", "golden-temple-amritsar", "Golden Temple", "Amritsar", "Punjab", "punjab", 31.6200, 74.8765, "religious", "Harmandir Sahib, the holiest Sikh shrine, a golden temple floating in a sacred pool."],
  ["Wagah", "wagah-border", "Wagah Border Ceremony", "Amritsar", "Punjab", "punjab", 31.6045, 74.5731, "cultural", "The daily flag-lowering ceremony at the India-Pakistan border, full of drill, pageantry and patriotic fervour."],
  ["Jallianwala Bagh", "jallianwala-bagh", "Jallianwala Bagh", "Amritsar", "Punjab", "punjab", 31.6206, 74.8802, "cultural", "A memorial garden commemorating the 1919 massacre, a place of quiet remembrance."],

  // ---------- Jammu & Kashmir, Ladakh ----------
  ["Dal Lake", "dal-lake", "Dal Lake", "Srinagar", "Jammu & Kashmir", "jammu-and-kashmir", 34.1166, 74.8681, "nature", "The jewel of Srinagar, a lake of shikara rides, floating gardens and houseboats beneath the mountains."],
  ["Gulmarg", "gulmarg", "Gulmarg", "Gulmarg", "Jammu & Kashmir", "jammu-and-kashmir", 34.0484, 74.3805, "nature", "A meadow resort known for skiing and one of the highest gondola rides in the world."],
  ["Shalimar Bagh, Srinagar", "shalimar-bagh-srinagar", "Shalimar Bagh", "Srinagar", "Jammu & Kashmir", "jammu-and-kashmir", 34.1486, 74.8681, "heritage", "A terraced Mughal garden on the shore of Dal Lake, built by Emperor Jahangir for his queen."],
  ["Leh Palace", "leh-palace", "Leh Palace", "Leh", "Ladakh", "ladakh", 34.1650, 77.5848, "heritage", "A ruined nine-storey royal palace overlooking Leh and the Indus valley."],
  ["Thiksey Monastery", "thiksey-monastery", "Thiksey Monastery", "Leh", "Ladakh", "ladakh", 34.0590, 77.6665, "religious", "A twelve-storey Tibetan Buddhist monastery on a hilltop, often called a mini Potala Palace."],

  // ---------- North East ----------
  ["Tsomgo Lake", "tsomgo-lake", "Tsomgo Lake", "Gangtok", "Sikkim", "sikkim", 27.3750, 88.7633, "nature", "A glacial lake high in the East Sikkim mountains, with changing colours through the seasons."],
  ["Rumtek Monastery", "rumtek-monastery", "Rumtek Monastery", "Gangtok", "Sikkim", "sikkim", 27.2889, 88.5611, "religious", "A major Tibetan Buddhist monastery, the seat of the Karmapa in exile."],
  ["Double Decker Living Root Bridge", "living-root-bridge", "Double Decker Living Root Bridge", "Cherrapunji", "Meghalaya", "meghalaya", 25.2507, 91.7211, "nature", "A living bridge grown from rubber tree roots over generations by the Khasi people."],
  ["Nohkalikai Falls", "nohkalikai-falls", "Nohkalikai Falls", "Cherrapunji", "Meghalaya", "meghalaya", 25.2755, 91.6850, "nature", "One of the tallest plunge waterfalls in India, falling into an emerald pool near Cherrapunji."],
  ["Kamakhya Temple", "kamakhya-temple", "Kamakhya Temple", "Guwahati", "Assam", "assam", 26.1664, 91.7058, "religious", "An ancient hilltop Shakti temple and a major pilgrimage site in the Nilachal hills."],
  ["Majuli", "majuli", "Majuli Island", "Jorhat", "Assam", "assam", 26.9500, 94.1667, "nature", "The world's largest river island in the Brahmaputra, a centre of Assamese Vaishnavite culture."],

  // ---------- Bihar, Odisha, Chhattisgarh ----------
  ["Mahabodhi Temple", "mahabodhi-temple", "Mahabodhi Temple", "Bodh Gaya", "Bihar", "bihar", 24.6961, 84.9913, "religious", "The temple marking the place where the Buddha attained enlightenment, a UNESCO World Heritage Site."],
  ["Nalanda", "nalanda", "Nalanda Ruins", "Nalanda", "Bihar", "bihar", 25.1358, 85.4438, "heritage", "The ruins of an ancient Buddhist university that drew scholars from across Asia."],
  ["Udayagiri and Khandagiri Caves", "udayagiri-khandagiri-caves", "Udayagiri & Khandagiri Caves", "Bhubaneswar", "Odisha", "odisha", 20.2625, 85.7861, "heritage", "Ancient Jain rock-cut caves on twin hills, with intricate carvings from the 2nd century BCE."],
  ["Chitrakote Falls", "chitrakote-falls", "Chitrakote Falls", "Jagdalpur", "Chhattisgarh", "chhattisgarh", 19.2079, 81.7000, "nature", "The widest waterfall in India, often called the Niagara of India."],

  // ---------- Puducherry, Chandigarh ----------
  ["Matrimandir", "matrimandir-auroville", "Matrimandir, Auroville", "Auroville", "Puducherry", "puducherry", 12.0067, 79.8106, "cultural", "A golden spherical meditation chamber at the centre of the experimental town of Auroville."],
  ["Promenade Beach", "promenade-beach-pondicherry", "Promenade Beach", "Puducherry", "Puducherry", "puducherry", 11.9337, 79.8337, "nature", "A seafront promenade along the French Quarter, lovely at sunrise with cafes and colonial buildings."],
  ["Rock Garden of Chandigarh", "rock-garden-chandigarh", "Rock Garden of Chandigarh", "Chandigarh", "Chandigarh", "chandigarh", 30.7525, 76.8101, "cultural", "A fantasy sculpture garden built entirely of recycled and industrial waste."],
];

const hashString = (value) => {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
};

const curatedPlacesExtra = ROWS.map(
  ([wikiTitle, slug, name, city, state, stateSlug, latitude, longitude, kind, description]) => ({
    wikiTitle,
    name,
    slug,
    state,
    stateSlug,
    city,
    address: `${name}, ${city}, ${state}`,
    latitude,
    longitude,
    categories: CATEGORIES_BY_KIND[kind],
    description,
    image: "",
    cloudinaryPublicId: `voyara/places-v2/${slug}`,
    imageAlt: `${name} in ${city}`,
    source: SOURCE_BY_KIND[kind],
    rating: Math.round((4.5 + (hashString(slug) % 5) / 10) * 10) / 10,
  }),
);

module.exports = curatedPlacesExtra;
